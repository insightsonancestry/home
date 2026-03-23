#!/usr/bin/env python3
"""
Extract samples from a PLINK dataset by population labels.
Reads a .fam file, filters individuals matching the given labels,
writes a --keep file, then runs PLINK to extract.
"""

import argparse
import subprocess
import sys


def parse_fam(fam_path):
    """Parse .fam file, return list of (family_id, individual_id) tuples."""
    entries = []
    with open(fam_path, 'r') as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) >= 2:
                entries.append((parts[0], parts[1]))
    return entries


def write_keep_file(fam_entries, labels, keep_path):
    """Write a PLINK --keep file with individuals matching the given labels."""
    label_set = set(labels)
    count = 0
    with open(keep_path, 'w') as f:
        for fam_id, ind_id in fam_entries:
            if fam_id in label_set:
                f.write(f"{fam_id}\t{ind_id}\n")
                count += 1
    return count


def run_plink(plink_bin, bed, bim, fam, keep, out):
    """Run PLINK extraction."""
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
    parser = argparse.ArgumentParser(description="Extract samples by population labels")
    parser.add_argument('--plink', required=True, help='Path to PLINK binary')
    parser.add_argument('--bed', required=True, help='Path to .bed file')
    parser.add_argument('--bim', required=True, help='Path to .bim file')
    parser.add_argument('--fam', required=True, help='Path to user .fam file')
    parser.add_argument('--labels', required=True, nargs='+', help='Population labels to extract')
    parser.add_argument('--out', required=True, help='Output prefix')
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
