import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { execSync } from "child_process";
import { createWriteStream, readFileSync, existsSync, mkdirSync } from "fs";
import { pipeline } from "stream/promises";

const s3 = new S3Client({});
const BUCKET = process.env.BUCKET_NAME;
const PLINK = "/opt/bin/plink";
const CONVERT_SCRIPT = "/opt/scripts/convert_2_23andme.py";
const EXTRACT_SCRIPT = "/opt/scripts/extract_samples.py";
const EFS_DATA = "/mnt/data";
const WORK_DIR = "/tmp/work";

const PROVIDER_MAP = {
  ancestry: "ancestrydna",
  ftdna: "ftdna_new",
  myheritage: "myheritage",
  livingdna: "livingdna",
};

const DATASET_MAP = {
  "1240K": { bed: "v62_1240k/v62.0_1240k_public.bed", bim: "v62_1240k/v62.0_1240k_public.bim" },
  "HO":    { bed: "v62_HO/v62.0_HO_public.bed",       bim: "v62_HO/v62.0_HO_public.bim" },
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

export const handler = async (event) => {
  const { action } = event;

  cleanWorkDir();

  // Action: convert (non-23andMe → 23andMe format)
  if (action === "convert") {
    const { userId, sampleId, provider } = event;
    if (!userId || !sampleId || !provider) throw new Error("Missing userId, sampleId, or provider");

    if (provider === "23andme") {
      return { status: "skipped", reason: "23andMe format, no conversion needed" };
    }

    const convertType = PROVIDER_MAP[provider];
    if (!convertType) throw new Error(`Unsupported provider: ${provider}`);

    const rawS3Key = `${userId}/rawfiles/${sampleId}.txt`;
    const rawLocalPath = `${WORK_DIR}/${sampleId}.txt`;
    const convertedLocalPath = `${WORK_DIR}/${sampleId}_23.txt`;
    const convertedS3Key = `${userId}/rawfiles/${sampleId}_23.txt`;

    await downloadFromS3(rawS3Key, rawLocalPath);

    try {
      execSync(`python3 ${CONVERT_SCRIPT} -t ${convertType} -i ${rawLocalPath} -o ${convertedLocalPath}`, {
        encoding: "utf-8", timeout: 120_000,
      });
    } catch (err) {
      console.error("Conversion stderr:", err.stderr);
      throw new Error("File format conversion failed");
    }

    if (!existsSync(convertedLocalPath)) throw new Error("Conversion produced no output file");
    await uploadToS3(convertedLocalPath, convertedS3Key);

    return { status: "success", action: "convert", convertedFile: convertedS3Key };
  }

  // Action: extract (extract samples by population labels for qpAdm)
  if (action === "extract") {
    const { userId, dataset, sources, references, target, runId } = event;
    if (!userId || !dataset || !sources || !references || !target || !runId) {
      throw new Error("Missing required fields for extract");
    }

    const ds = DATASET_MAP[dataset];
    if (!ds) throw new Error(`Invalid dataset: ${dataset}`);

    const bedPath = `${EFS_DATA}/${ds.bed}`;
    const bimPath = `${EFS_DATA}/${ds.bim}`;
    const famS3Key = `${userId}/qpadm/datasets/${userId}_${dataset}.fam`;
    const famLocalPath = `${WORK_DIR}/user.fam`;
    const outputPrefix = `${WORK_DIR}/extracted`;

    // Download user's .fam from S3
    await downloadFromS3(famS3Key, famLocalPath);

    // All labels to extract
    const allLabels = [...sources, ...references, target];

    // Run extraction
    const cmd = [
      "python3", EXTRACT_SCRIPT,
      "--plink", PLINK,
      "--bed", bedPath,
      "--bim", bimPath,
      "--fam", famLocalPath,
      "--labels", ...allLabels,
      "--out", outputPrefix,
    ].join(" ");

    try {
      const output = execSync(cmd, { encoding: "utf-8", timeout: 240_000 });
      console.log("Extract output:", output);
    } catch (err) {
      console.error("Extract stderr:", err.stderr);
      throw new Error("Sample extraction failed");
    }

    // Upload extracted files to S3
    const extensions = ["bed", "bim", "fam"];
    const uploadedFiles = [];
    const tempPrefix = `${userId}/qpadm/datasets/temp_${runId}`;

    for (const ext of extensions) {
      const localFile = `${outputPrefix}.${ext}`;
      if (!existsSync(localFile)) throw new Error(`Extraction did not produce .${ext} file`);
      const s3Key = `${tempPrefix}.${ext}`;
      await uploadToS3(localFile, s3Key);
      uploadedFiles.push(s3Key);
    }

    return { status: "success", action: "extract", files: uploadedFiles, tempPrefix };
  }

  throw new Error(`Unknown action: ${action}`);
};
