#!/usr/bin/env Rscript

library(admixtools)

args <- commandArgs(trailingOnly = TRUE)

# Args: prefix output_file target left1,left2,... right1,right2,...
if (length(args) < 4) {
  stop("Usage: run_qpadm.R <prefix> <output_file> <target> <left_pops> <right_pops>")
}

prefix      <- args[1]
output_file <- args[2]
target      <- args[3]
left        <- strsplit(args[4], ",")[[1]]
right       <- strsplit(args[5], ",")[[1]]

cat("Running qpAdm...\n")
cat("Prefix:", prefix, "\n")
cat("Target:", target, "\n")
cat("Left:", paste(left, collapse=", "), "\n")
cat("Right:", paste(right, collapse=", "), "\n")

result <- qpadm(prefix, left, right, target, return_f4 = TRUE)

# Build output
output <- character()

output <- c(output, sprintf("target: %s", target))
output <- c(output, "")

# Weights
output <- c(output, "===== WEIGHTS =====")
w <- result$weights
for (i in seq_len(nrow(w))) {
  output <- c(output, sprintf("source: %s %.1f%%", w$left[i], w$weight[i] * 100))
}

# P-value and chisq
if (!is.null(result$rankdrop)) {
  rd <- result$rankdrop
  full_row <- rd[rd$f4rank == max(rd$f4rank), ]
  if (nrow(full_row) > 0) {
    output <- c(output, sprintf("p-value: %.6f", full_row$p[1]))
    output <- c(output, sprintf("chisq: %.3f", full_row$chisq[1]))
  }
}

output <- c(output, "")

# Rankdrop
output <- c(output, "===== RANKDROP =====")
rd_text <- capture.output(print(result$rankdrop))
output <- c(output, rd_text)
output <- c(output, "")

# Popdrop
output <- c(output, "===== POPDROP =====")
pd_text <- capture.output(print(result$popdrop))
output <- c(output, pd_text)
output <- c(output, "")

# Gendstat (f4 residuals)
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

# Write to file
writeLines(output, output_file)
cat("Output written to:", output_file, "\n")

# Also print to stdout
cat(paste(output, collapse="\n"), "\n")
