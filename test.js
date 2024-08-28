const fs = require("fs");
const { encode } = require("gpt-3-encoder");

const START_NEXT_CODE_BLOCK_AT_FRACTION = (1 / 5) * 4;
const SOFT_LIMIT_FRACTION = 1 / 4;
const HARD_LIMIT_FRACTION = 1 / 3;

const code = fs.readFileSync("dust.txt");
const data = splitCode(code.toString());
fs.writeFileSync("split.txt",data.join("\n\n\nSPLIT LINE\n\n\n"));
function splitCode(code){
  console.log("Splitting code into blocks");
  
  let codeBlocks = [];
  let currentCode = code;

  const numTokensForRequestAndResponse = 128000;
  const tokenSoftLimit = numTokensForRequestAndResponse * SOFT_LIMIT_FRACTION;
  const tokenHardLimit = numTokensForRequestAndResponse * HARD_LIMIT_FRACTION;

  while (currentCode.length > 0) {
    const { removedCode, remainingCode } = removeCodeWithLimits(currentCode, {
      softLimit: tokenSoftLimit,
      hardLimit: tokenHardLimit,
    });
    codeBlocks.push(removedCode);
    currentCode = remainingCode;
  }

  console.log(`Splitted code ${codeBlocks.length} blocks`);
  
  return codeBlocks;
}

function removeCodeWithLimits(code,limits){
  let stopAt = code.length;
  let lastStopOver = stopAt;

  while (true) {
    const codeSlice = code.slice(0, stopAt);
    const numTokens = encode(codeSlice).length;
    if (numTokens > limits.hardLimit) {
      lastStopOver = stopAt;
      stopAt = Math.max(stopAt / 2);
      continue;
    }
    if (numTokens < limits.softLimit) {
      if (stopAt === lastStopOver) {
        // Cannot add any more code, stop here
        break;
      }

      stopAt = Math.max(stopAt + (lastStopOver - stopAt) / 2);
      continue;
    }

    break;
  }

  let removedCode = code.slice(0, stopAt);
  let remainingCode =
    stopAt === lastStopOver
      ? ""
      : code.slice(stopAt * START_NEXT_CODE_BLOCK_AT_FRACTION); // Remaining code starts some way through the removed code to allow for some overlap
  return { removedCode, remainingCode };
}