import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { execSync } from "child_process";
import { createWriteStream, readFileSync, existsSync, mkdirSync, statSync } from "fs";
import { pipeline } from "stream/promises";

const s3 = new S3Client({});
const BUCKET = process.env.BUCKET_NAME;
const PLINK = "/opt/bin/plink";
const CONVERT_SCRIPT = "/opt/scripts/convert_2_23andme.py";
const EXTRACT_SCRIPT = "/opt/scripts/extract_samples.py";
const QPADM_SCRIPT = "/opt/scripts/run_qpadm.R";
const WORK_DIR = "/tmp/work";
const CACHE_DIR = "/tmp/cache";

const PROVIDER_MAP = {
  ancestry: "ancestrydna",
  ftdna: "ftdna_new",
  myheritage: "myheritage",
  livingdna: "livingdna",
};

const DATASET_FILES = {
  "1240K": { prefix: "v62_1240k/v62.0_1240k_public", key: "v62_1240k" },
  "HO":    { prefix: "v62_HO/v62.0_HO_public",       key: "v62_HO" },
};

async function downloadFromS3(key, destPath) {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  await pipeline(res.Body, createWriteStream(destPath));
}

async function uploadToS3(localPath, key) {
  const body = readFileSync(localPath);
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body }));
}

function cleanWorkDir() {
  if (existsSync(WORK_DIR)) execSync(`rm -rf ${WORK_DIR}`);
  mkdirSync(WORK_DIR, { recursive: true });
}

async function ensureRefDataCached(dataset) {
  const ds = DATASET_FILES[dataset];
  if (!ds) throw new Error(`Invalid dataset: ${dataset}`);

  const cacheSubdir = `${CACHE_DIR}/${ds.key}`;
  mkdirSync(cacheSubdir, { recursive: true });

  for (const ext of ["bed", "bim"]) {
    const localPath = `${cacheSubdir}/${ds.prefix.split("/")[1]}.${ext}`;
    if (!existsSync(localPath)) {
      console.log(`Downloading ${ext} to cache...`);
      await downloadFromS3(`${ds.prefix}.${ext}`, localPath);
      console.log(`Cached ${ext} (${(statSync(localPath).size / 1024 / 1024).toFixed(0)} MB)`);
    } else {
      console.log(`Using cached ${ext}`);
    }
  }

  const baseName = ds.prefix.split("/")[1];
  return {
    bed: `${cacheSubdir}/${baseName}.bed`,
    bim: `${cacheSubdir}/${baseName}.bim`,
  };
}

export const handler = async (event) => {
  const { action } = event;

  // Warm ping — keep Lambda alive, don't do any work
  if (action === "warmup") {
    return { status: "warm" };
  }

  cleanWorkDir();

  // === CONVERT: non-23andMe → 23andMe format ===
  if (action === "convert") {
    const { userId, sampleId, provider } = event;
    if (!userId || !sampleId || !provider) throw new Error("Missing fields");

    if (provider === "23andme") {
      return { status: "skipped", reason: "23andMe format, no conversion needed" };
    }

    const convertType = PROVIDER_MAP[provider];
    if (!convertType) throw new Error(`Unsupported provider: ${provider}`);

    const rawLocalPath = `${WORK_DIR}/${sampleId}.txt`;
    const convertedLocalPath = `${WORK_DIR}/${sampleId}_23.txt`;

    await downloadFromS3(`${userId}/rawfiles/${sampleId}.txt`, rawLocalPath);

    execSync(`python3 ${CONVERT_SCRIPT} -t ${convertType} -i ${rawLocalPath} -o ${convertedLocalPath}`, {
      encoding: "utf-8", timeout: 120_000,
    });

    if (!existsSync(convertedLocalPath)) throw new Error("Conversion produced no output");

    await uploadToS3(convertedLocalPath, `${userId}/rawfiles/${sampleId}_23.txt`);

    return { status: "success", action: "convert" };
  }

  // === QPADM: extract + run qpAdm in one shot ===
  if (action === "qpadm") {
    const { userId, dataset, sources, references, target, runId } = event;
    if (!userId || !dataset || !sources || !references || !target || !runId) {
      throw new Error("Missing fields for qpadm");
    }

    // Step 1: Cache reference .bed/.bim from S3 (warm runs skip this)
    const refFiles = await ensureRefDataCached(dataset);

    // Step 2: Download user's .fam
    const famS3Key = `${userId}/qpadm/datasets/${userId}_${dataset}.fam`;
    const famLocalPath = `${WORK_DIR}/user.fam`;
    await downloadFromS3(famS3Key, famLocalPath);

    // Step 3: Extract samples with PLINK
    const allLabels = [...sources, ...references, target];
    const extractedPrefix = `${WORK_DIR}/extracted`;

    execSync([
      "python3", EXTRACT_SCRIPT,
      "--plink", PLINK,
      "--bed", refFiles.bed,
      "--bim", refFiles.bim,
      "--fam", famLocalPath,
      "--labels", ...allLabels,
      "--out", extractedPrefix,
    ].join(" "), { encoding: "utf-8", timeout: 240_000 });

    // Step 4: Run qpAdm
    const outputPath = `${WORK_DIR}/output.txt`;
    const left = sources.join(",");
    const right = references.join(",");

    execSync(
      `Rscript ${QPADM_SCRIPT} ${extractedPrefix} ${outputPath} ${target} "${left}" "${right}"`,
      { encoding: "utf-8", timeout: 540_000 },
    );

    if (!existsSync(outputPath)) throw new Error("qpAdm produced no output");

    // Step 5: Upload results
    const outputS3Key = `${userId}/qpadm/outputs/${runId}.txt`;
    await uploadToS3(outputPath, outputS3Key);

    const resultText = readFileSync(outputPath, "utf-8");

    return {
      status: "success",
      action: "qpadm",
      outputFile: outputS3Key,
      result: resultText,
    };
  }

  throw new Error(`Unknown action: ${action}`);
};
