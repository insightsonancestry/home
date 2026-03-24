import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { execFileSync } from "child_process";
import { createWriteStream, readFileSync, writeFileSync, existsSync, mkdirSync, statSync, rmSync, chmodSync } from "fs";
import { pipeline } from "stream/promises";

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const BUCKET = process.env.BUCKET_NAME;
const SAMPLES_TABLE = process.env.SAMPLES_TABLE || "ioa-samples";
const PLINK = "/opt/bin/plink";
const SCRIPTS_DIR = "/tmp/scripts";
const CONVERT_SCRIPT = `${SCRIPTS_DIR}/convert_2_23andme.py`;
const EXTRACT_SCRIPT = `${SCRIPTS_DIR}/extract_samples.py`;
const MERGE_SCRIPT = `${SCRIPTS_DIR}/merge_raw.py`;
const QPADM_SCRIPT = `${SCRIPTS_DIR}/run_qpadm.R`;
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

const SAFE_LABEL_RE = /^[a-zA-Z0-9_.\-:]+$/;

function validateLabel(label) {
  if (typeof label !== "string" || !SAFE_LABEL_RE.test(label) || label.length > 100) {
    throw new Error(`Invalid population label: ${label}`);
  }
}

async function downloadFromS3(key, destPath) {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  await pipeline(res.Body, createWriteStream(destPath));
}

async function uploadToS3(localPath, key) {
  const body = readFileSync(localPath);
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body }));
}

function cleanWorkDir() {
  if (existsSync(WORK_DIR)) rmSync(WORK_DIR, { recursive: true, force: true });
  mkdirSync(WORK_DIR, { recursive: true });
}

async function updateStage(userId, runId, stage) {
  try {
    await ddb.send(new UpdateCommand({
      TableName: SAMPLES_TABLE,
      Key: { userId, sampleId: `run#${runId}` },
      UpdateExpression: "SET stage = :s",
      ExpressionAttributeValues: { ":s": stage },
    }));
  } catch (err) {
    console.warn("Failed to update stage:", err.message);
  }
}

async function checkCancelled(userId, runId) {
  try {
    const result = await ddb.send(new GetCommand({
      TableName: SAMPLES_TABLE,
      Key: { userId, sampleId: `run#${runId}` },
      ProjectionExpression: "#s",
      ExpressionAttributeNames: { "#s": "status" },
    }));
    return result.Item?.status === "cancelled";
  } catch {
    return false;
  }
}

async function completeRun(userId, runId, durationMs) {
  try {
    await ddb.send(new UpdateCommand({
      TableName: SAMPLES_TABLE,
      Key: { userId, sampleId: `run#${runId}` },
      UpdateExpression: "SET #s = :status, stage = :stage, durationMs = :d",
      ConditionExpression: "#s = :running",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":status": "completed", ":stage": "complete", ":d": durationMs, ":running": "running" },
    }));
  } catch (err) {
    console.warn("Failed to complete run (may be cancelled):", err.message);
  }
}

async function failRun(userId, runId, error, durationMs) {
  try {
    await ddb.send(new UpdateCommand({
      TableName: SAMPLES_TABLE,
      Key: { userId, sampleId: `run#${runId}` },
      UpdateExpression: "SET #s = :status, #e = :err, durationMs = :d",
      ConditionExpression: "#s = :running",
      ExpressionAttributeNames: { "#s": "status", "#e": "error" },
      ExpressionAttributeValues: { ":status": "failed", ":err": error.slice(0, 500), ":d": durationMs, ":running": "running" },
    }));
  } catch (err) {
    console.warn("Failed to mark run as failed (may be cancelled):", err.message);
  }
}

let lastCachedDataset = null;

async function ensureRefDataCached(dataset) {
  const ds = DATASET_FILES[dataset];
  if (!ds) throw new Error(`Invalid dataset: ${dataset}`);

  // Clear previous dataset cache if switching datasets
  if (lastCachedDataset && lastCachedDataset !== dataset) {
    const oldDs = DATASET_FILES[lastCachedDataset];
    const oldSubdir = `${CACHE_DIR}/${oldDs.key}`;
    if (existsSync(oldSubdir)) {
      rmSync(oldSubdir, { recursive: true, force: true });
      console.log(`Cleared cached ${lastCachedDataset} dataset`);
    }
  }

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

  lastCachedDataset = dataset;

  const baseName = ds.prefix.split("/")[1];
  return {
    bed: `${cacheSubdir}/${baseName}.bed`,
    bim: `${cacheSubdir}/${baseName}.bim`,
  };
}

async function ensureSnplistCached() {
  const localPath = `${CACHE_DIR}/plink.snplist`;
  if (!existsSync(localPath)) {
    mkdirSync(CACHE_DIR, { recursive: true });
    console.log("Downloading plink.snplist...");
    await downloadFromS3("tools/plink.snplist", localPath);
    console.log("Cached plink.snplist");
  }
  return localPath;
}

// ── Inline scripts ──────────────────────────────────────────────────

const CONVERT_SCRIPT_SRC = `\
import argparse
import os
import sys
from functools import cmp_to_key


def sort_genos(a, b):
    def chromosome_value(ch):
        return {'X': 23, 'Y': 24, 'XY': 25, 'MT': 26}.get(ch, int(ch))
    ch_a = chromosome_value(a[1])
    ch_b = chromosome_value(b[1])
    if ch_a != ch_b:
        return -1 if ch_a < ch_b else 1
    loc_a = int(a[2])
    loc_b = int(b[2])
    if loc_a != loc_b:
        return -1 if loc_a < loc_b else 1
    return 0


def sort_and_write(data_file, output_file):
    try:
        with open(data_file, 'r') as f:
            lines = f.readlines()
        filtered = []
        for line in lines:
            stripped = line.strip()
            if not stripped or '#' in stripped or 'RSID' in stripped:
                continue
            filtered.append(stripped)
        genos = [line.split() for line in filtered if '--' not in line]
        genos.sort(key=cmp_to_key(sort_genos))
        with open(output_file, 'w') as f:
            for geno in genos:
                f.write('\\t'.join([geno[0], geno[1], geno[2], geno[3]]) + '\\n')
        os.remove(data_file)
    except FileNotFoundError:
        print(f"Error: The file '{data_file}' does not exist.")
    except PermissionError:
        print(f"Error: Permission denied when trying to access the file '{data_file}'.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")


def convert_ancestrydna(input_file_name, output_file_name):
    try:
        infile = open(input_file_name, 'r')
    except IOError:
        print(f"Error opening input file: {input_file_name}")
        sys.exit(1)
    try:
        outfile = open(output_file_name, 'w')
    except IOError:
        print(f"Error creating output file: {output_file_name}")
        infile.close()
        sys.exit(1)
    for line in infile:
        lowercase_line = line.lower()
        if 'rsid' in lowercase_line or '#' in lowercase_line:
            continue
        columns = line.rstrip('\\n').split('\\t')
        if len(columns) >= 5:
            for i in range(3):
                outfile.write(columns[i] + '\\t')
            if columns[3] == '0' and columns[4] == '0':
                outfile.write('--\\n')
            else:
                outfile.write(columns[3] + columns[4] + '\\n')
        else:
            outfile.write(line)
    infile.close()
    outfile.close()


def convert_ftdna_myheritage(input_file_name, output_file_name, file_type):
    needs_sort = file_type == 'ftdna_new'
    intermediate = output_file_name + ".unsorted" if needs_sort else output_file_name
    try:
        infile = open(input_file_name, 'r')
    except IOError:
        print("Error opening input file.")
        sys.exit(1)
    try:
        outfile = open(intermediate, 'w')
    except IOError:
        print("Error creating output file.")
        infile.close()
        sys.exit(1)
    for line in infile:
        if 'RSID' in line or '#' in line:
            continue
        line = line.replace(',', '\\t').replace('"', '')
        outfile.write(line)
    infile.close()
    outfile.close()
    if needs_sort:
        sort_and_write(intermediate, output_file_name)


def convert_livingdna(input_file_name, output_file_name):
    try:
        infile = open(input_file_name, 'r')
    except IOError:
        print("Error opening input file.")
        sys.exit(1)
    try:
        outfile = open(output_file_name, 'w')
    except IOError:
        print("Error creating output file.")
        infile.close()
        sys.exit(1)
    for line in infile:
        if 'rsid' in line or '#' in line:
            continue
        columns = line.rstrip('\\n').split('\\t')
        if len(columns) >= 4:
            alpha_count = sum(1 for c in columns[3] if c.isalpha())
            if alpha_count > 2:
                outfile.write('\\t'.join(columns[:3]) + '\\t' + '--\\n')
            else:
                outfile.write('\\t'.join(columns) + '\\n')
        else:
            outfile.write('\\t'.join(columns) + '\\n')
    infile.close()
    outfile.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-t", required=True,
                        choices=["ancestrydna", "ftdna_new", "ftdna_old", "myheritage",
                                 "mapmygenome", "livingdna", "famfinder"])
    parser.add_argument("-i", required=True)
    parser.add_argument("-o", required=True)
    args = parser.parse_args()
    if not os.path.isfile(args.i):
        print(f"Error opening input file: {args.i}", file=sys.stderr)
        sys.exit(1)
    if args.t == 'ancestrydna':
        convert_ancestrydna(args.i, args.o)
    elif args.t == 'ftdna_new':
        convert_ftdna_myheritage(args.i, args.o, args.t)
    elif args.t in ('myheritage', 'ftdna_old'):
        convert_ftdna_myheritage(args.i, args.o, args.t)
    elif args.t == 'livingdna':
        convert_livingdna(args.i, args.o)


if __name__ == "__main__":
    main()
`;

const EXTRACT_SCRIPT_SRC = `\
import argparse
import subprocess
import sys


def parse_fam(fam_path):
    entries = []
    with open(fam_path, 'r') as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) >= 2:
                entries.append((parts[0], parts[1]))
    return entries


def write_keep_file(fam_entries, labels, keep_path):
    label_set = set(labels)
    count = 0
    with open(keep_path, 'w') as f:
        for fam_id, ind_id in fam_entries:
            if fam_id in label_set:
                f.write(f"{fam_id}\\t{ind_id}\\n")
                count += 1
    return count


def run_plink(plink_bin, bed, bim, fam, keep, out):
    cmd = [
        plink_bin,
        '--bed', bed,
        '--bim', bim,
        '--fam', fam,
        '--keep', keep,
        '--make-bed',
        '--out', out,
        '--allow-no-sex',
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=240)
    if result.returncode != 0:
        print(f"PLINK stderr: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    print(result.stdout)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--plink', required=True)
    parser.add_argument('--bed', required=True)
    parser.add_argument('--bim', required=True)
    parser.add_argument('--fam', required=True)
    parser.add_argument('--labels', required=True, nargs='+')
    parser.add_argument('--out', required=True)
    args = parser.parse_args()
    fam_entries = parse_fam(args.fam)
    keep_path = args.out + '.keep'
    count = write_keep_file(fam_entries, args.labels, keep_path)
    if count == 0:
        print("Error: no individuals matched the given labels", file=sys.stderr)
        sys.exit(1)
    print(f"Extracting {count} individuals matching {len(args.labels)} labels...")
    run_plink(args.plink, args.bed, args.bim, args.fam, keep_path, args.out)


if __name__ == '__main__':
    main()
`;

const MERGE_SCRIPT_SRC = `\
import argparse
import os
import subprocess
import sys

PLINK = os.environ.get("PLINK_BIN", "plink")

TEMP_FILES = [
    "add.bed", "add.bim", "add.fam", "add.hh", "add.log", "add.nosex",
    "basic.bed", "basic.bim", "basic.fam", "basic.hh", "basic.log", "basic.nosex",
    "basic_tmp.bed", "basic_tmp.bim", "basic_tmp.fam", "basic_tmp.hh", "basic_tmp.log", "basic_tmp.nosex",
]


def run_command(cmd_list):
    result = subprocess.run(cmd_list, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        print(f"Error executing command: {' '.join(cmd_list)}", file=sys.stderr)
        if result.stderr:
            print(result.stderr[:500], file=sys.stderr)
        sys.exit(1)


def delete_files():
    for f in TEMP_FILES:
        try:
            os.remove(f)
        except FileNotFoundError:
            pass


def main():
    parser = argparse.ArgumentParser(description="Merge a raw file into a PLINK base dataset")
    parser.add_argument("-i", required=True, help="Raw input file (without .txt extension)")
    parser.add_argument("-b", required=True, help="Base PLINK binary dataset prefix")
    parser.add_argument("-o", required=True, help="Output PLINK binary dataset prefix")
    args = parser.parse_args()

    raw_file = args.i
    base_dataset = args.b
    output_dataset = args.o
    missnp = f"{output_dataset}-merge.missnp"

    # Step 1: Convert raw file to PLINK binary format
    run_command([PLINK, "--allow-no-sex", "--23file", f"{raw_file}.txt", "--make-bed", "--out", "add"])

    # Step 2: Extract SNPs from the snplist
    run_command([PLINK, "--bfile", "add", "--extract", "plink.snplist", "--make-bed", "--allow-no-sex", "--out", "basic"])

    # Step 3: Try to merge with base dataset
    merge_cmd = [
        PLINK, "--bfile", base_dataset, "--bmerge", "basic.bed", "basic.bim", "basic.fam",
        "--indiv-sort", "0", "--make-bed", "--allow-no-sex", "--out", output_dataset,
    ]
    result = subprocess.run(merge_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    if result.returncode != 0:
        # Flip strands and retry
        flip_cmd = [
            PLINK, "--bfile", "basic", "--flip", missnp,
            "--make-bed", "--allow-no-sex", "--out", "basic_tmp",
        ]
        flip_result = subprocess.run(flip_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        if flip_result.returncode == 0:
            merge2_cmd = [
                PLINK, "--bfile", base_dataset, "--bmerge", "basic_tmp.bed", "basic_tmp.bim", "basic_tmp.fam",
                "--indiv-sort", "0", "--make-bed", "--allow-no-sex", "--out", output_dataset,
            ]
            merge2_result = subprocess.run(merge2_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

            if merge2_result.returncode != 0:
                # Exclude problematic SNPs and retry
                run_command([
                    PLINK, "--bfile", "basic_tmp", "--exclude", missnp,
                    "--make-bed", "--allow-no-sex", "--out", "basic",
                ])
                run_command(merge_cmd)
        else:
            print("Strand flip failed", file=sys.stderr)
            sys.exit(1)

    delete_files()


if __name__ == "__main__":
    main()
`;

const QPADM_SCRIPT_SRC = `\
library(admixtools)

args <- commandArgs(trailingOnly = TRUE)

if (length(args) < 5) {
  stop("Usage: run_qpadm.R <prefix> <output_file> <target> <left_pops> <right_pops> [allsnps]")
}

prefix      <- args[1]
output_file <- args[2]
target      <- args[3]
left        <- strsplit(args[4], ",")[[1]]
right       <- strsplit(args[5], ",")[[1]]
use_allsnps <- if (length(args) >= 6) tolower(args[6]) == "true" else FALSE

cat("Running qpAdm...\\n")
cat("Prefix:", prefix, "\\n")
cat("Target:", target, "\\n")
cat("Left:", paste(left, collapse=", "), "\\n")
cat("Right:", paste(right, collapse=", "), "\\n")
cat("allsnps:", use_allsnps, "\\n")

result <- qpadm(prefix, left, right, target, return_f4 = TRUE, allsnps = use_allsnps)

output <- character()
output <- c(output, sprintf("target: %s", target))
output <- c(output, "")

output <- c(output, "===== WEIGHTS =====")
w <- result$weights
for (i in seq_len(nrow(w))) {
  output <- c(output, sprintf("source: %s %.1f%%", w$left[i], w$weight[i] * 100))
}

if (!is.null(result$rankdrop)) {
  rd <- result$rankdrop
  full_row <- rd[rd$f4rank == max(rd$f4rank), ]
  if (nrow(full_row) > 0) {
    output <- c(output, sprintf("p-value: %.6f", full_row$p[1]))
    output <- c(output, sprintf("chisq: %.3f", full_row$chisq[1]))
  }
}

output <- c(output, "")

output <- c(output, "===== RANKDROP =====")
rd_text <- capture.output(print(result$rankdrop))
output <- c(output, rd_text)
output <- c(output, "")

output <- c(output, "===== POPDROP =====")
pd_text <- capture.output(print(result$popdrop))
output <- c(output, pd_text)
output <- c(output, "")

f4 <- result$f4
rbase <- right[1]

fit_rows <- f4[f4$pop2 == "fit", ]
output <- c(output, "===== GENDSTAT =====")
for (i in 1:(length(right) - 1)) {
  for (j in (i + 1):length(right)) {
    r1 <- right[i]
    r2 <- right[j]
    row <- fit_rows[(fit_rows$pop3 == r1 & fit_rows$pop4 == r2) |
                    (fit_rows$pop3 == r2 & fit_rows$pop4 == r1), ]
    if (nrow(row) > 0) {
      output <- c(output, sprintf("gendstat: %35s %35s %9.3f", r1, r2, row$z[1]))
    }
  }
}

writeLines(output, output_file)
cat("Output written to:", output_file, "\\n")
cat(paste(output, collapse="\\n"), "\\n")
`;

function writeInlineScripts() {
  if (existsSync(CONVERT_SCRIPT)) return;
  mkdirSync(SCRIPTS_DIR, { recursive: true });
  writeFileSync(CONVERT_SCRIPT, CONVERT_SCRIPT_SRC);
  writeFileSync(EXTRACT_SCRIPT, EXTRACT_SCRIPT_SRC);
  writeFileSync(MERGE_SCRIPT, MERGE_SCRIPT_SRC);
  writeFileSync(QPADM_SCRIPT, QPADM_SCRIPT_SRC);
  chmodSync(CONVERT_SCRIPT, 0o755);
  chmodSync(EXTRACT_SCRIPT, 0o755);
  chmodSync(MERGE_SCRIPT, 0o755);
  chmodSync(QPADM_SCRIPT, 0o755);
  console.log("Inline scripts written to /tmp/scripts/");
}

function patchFam(famPath, targetLabel) {
  const content = readFileSync(famPath, "utf-8");
  const patched = content
    .split("\n")
    .map((line) => {
      if (!line.trim()) return line;
      return line.replace(/^FAM001\b/, targetLabel).replace(/\s-9$/, " 1");
    })
    .join("\n");
  writeFileSync(famPath, patched);
  console.log(`Patched .fam: FAM001 → ${targetLabel}, -9 → 1`);
}

// ── Handler ─────────────────────────────────────────────────────────

export const handler = async (event) => {
  const { action } = event;

  if (action === "warmup") {
    writeInlineScripts();
    return { status: "warm" };
  }

  writeInlineScripts();
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

    try {
      const rawLocalPath = `${WORK_DIR}/${sampleId}.txt`;
      const convertedLocalPath = `${WORK_DIR}/${sampleId}_23.txt`;

      await downloadFromS3(`${userId}/rawfiles/${sampleId}.txt`, rawLocalPath);

      try {
        execFileSync("python3", [CONVERT_SCRIPT, "-t", convertType, "-i", rawLocalPath, "-o", convertedLocalPath], {
          encoding: "utf-8", timeout: 180_000,
        });
      } catch (err) {
        const stderr = err.stderr || err.message;
        console.error("Conversion failed:", stderr);
        throw new Error("Conversion failed. Please check your file format and try again.");
      }

      if (!existsSync(convertedLocalPath)) throw new Error("Conversion produced no output");

      await uploadToS3(convertedLocalPath, `${userId}/rawfiles/${sampleId}_23.txt`);

      return { status: "success", action: "convert" };
    } finally {
      cleanWorkDir();
    }
  }

  // === QPADM: extract + run qpAdm ===
  if (action === "qpadm") {
    const { userId, dataset, sources, references, target, runId, userTarget, targetS3Key, individualSamples } = event;
    if (!userId || !dataset || !sources || !references || !target || !runId) {
      throw new Error("Missing fields for qpadm");
    }

    const startTime = Date.now();

    // Validate labels — for userTarget, target label won't be in the ref dataset
    const refLabels = [...sources, ...references];
    if (!userTarget) refLabels.push(target);
    for (const label of refLabels) {
      validateLabel(label);
    }
    if (userTarget) validateLabel(target);

    try {
      // Stage 1: Download reference data
      await updateStage(userId, runId, "downloading_ref");
      const refFiles = await ensureRefDataCached(dataset);

      // Download user's .fam to work dir
      const famS3Key = `${userId}/qpadm/datasets/${userId}_${dataset}.fam`;
      const famLocalPath = `${WORK_DIR}/user.fam`;
      await downloadFromS3(famS3Key, famLocalPath);

      // If individual sample selection, edit the work dir copy
      if (individualSamples && Object.keys(individualSamples).length > 0) {
        const famContent = readFileSync(famLocalPath, "utf-8");
        const modified = famContent.split("\n").map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;
          const parts = trimmed.split(/\s+/);
          const label = parts[0];
          const sampleId = parts[1];
          if (individualSamples[label] && !individualSamples[label].includes(sampleId)) {
            parts[0] = "label_x";
            return parts.join("\t");
          }
          return line;
        }).join("\n");
        writeFileSync(famLocalPath, modified);
        console.log("Applied individual sample selection — relabeled unselected samples to label_x");
      }

      // Stage 2: Curate — extract populations
      if (await checkCancelled(userId, runId)) throw new Error("Run cancelled by user");
      await updateStage(userId, runId, "curating");
      const extractedPrefix = `${WORK_DIR}/extracted`;

      try {
        execFileSync("python3", [
          EXTRACT_SCRIPT,
          "--plink", PLINK,
          "--bed", refFiles.bed,
          "--bim", refFiles.bim,
          "--fam", famLocalPath,
          "--labels", ...refLabels,
          "--out", extractedPrefix,
        ], { encoding: "utf-8", timeout: 180_000 });
      } catch (err) {
        const stderr = err.stderr || err.message;
        console.error("PLINK extraction failed:", stderr);
        throw new Error("Population extraction failed. Some labels may not exist in this dataset.");
      }

      let qpadmPrefix = extractedPrefix;

      // Stage 3 (userTarget only): Merge user sample
      if (userTarget && targetS3Key) {
        if (await checkCancelled(userId, runId)) throw new Error("Run cancelled by user");
        await updateStage(userId, runId, "merging");

        // Download user's 23andMe file
        const userFileName = targetS3Key.split("/").pop();
        const userFileBase = userFileName.replace(/\.txt$/, "");
        const userFilePath = `${WORK_DIR}/${userFileName}`;
        await downloadFromS3(targetS3Key, userFilePath);

        // Download plink.snplist to WORK_DIR
        const snplistCached = await ensureSnplistCached();
        const snplistLocal = `${WORK_DIR}/plink.snplist`;
        if (!existsSync(snplistLocal)) {
          writeFileSync(snplistLocal, readFileSync(snplistCached));
        }

        const mergedPrefix = `${WORK_DIR}/merged`;

        try {
          execFileSync("python3", [
            MERGE_SCRIPT,
            "-i", `${WORK_DIR}/${userFileBase}`,
            "-b", extractedPrefix,
            "-o", mergedPrefix,
          ], {
            encoding: "utf-8",
            timeout: 180_000,
            cwd: WORK_DIR,
            env: { ...process.env, PLINK_BIN: PLINK },
          });
        } catch (err) {
          const stderr = err.stderr || err.message;
          console.error("Merge failed:", stderr);
          throw new Error("Merge failed. The sample file may be incompatible with the reference dataset.");
        }

        // Patch .fam: FAM001 → target label, -9 → 1
        patchFam(`${mergedPrefix}.fam`, target);

        qpadmPrefix = mergedPrefix;
      }

      // Stage 4: Run qpAdm
      if (await checkCancelled(userId, runId)) throw new Error("Run cancelled by user");
      await updateStage(userId, runId, "running_qpadm");
      const outputPath = `${WORK_DIR}/output.txt`;

      try {
        execFileSync("Rscript", [
          QPADM_SCRIPT,
          qpadmPrefix,
          outputPath,
          target,
          sources.join(","),
          references.join(","),
          String(event.allsnps !== false),
        ], { encoding: "utf-8", timeout: 480_000 });
      } catch (err) {
        const stderr = err.stderr || err.message;
        console.error("qpAdm computation failed:", stderr);
        throw new Error("qpAdm computation failed. Check your model configuration and try again.");
      }

      if (!existsSync(outputPath)) throw new Error("qpAdm produced no output");

      const outputS3Key = `${userId}/qpadm/outputs/${runId}.txt`;
      await uploadToS3(outputPath, outputS3Key);

      const resultText = readFileSync(outputPath, "utf-8");
      const durationMs = Date.now() - startTime;

      await completeRun(userId, runId, durationMs);
      console.log(`qpAdm completed in ${(durationMs / 1000).toFixed(1)}s`);

      return {
        status: "success",
        action: "qpadm",
        outputFile: outputS3Key,
        result: resultText,
        durationMs,
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      await failRun(userId, runId, err.message || "Unknown error", durationMs);
      throw err;
    } finally {
      cleanWorkDir();
    }
  }

  throw new Error(`Unknown action: ${action}`);
};
