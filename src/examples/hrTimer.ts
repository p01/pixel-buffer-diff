declare type SummaryLine = {
  sumInMs: number;
  count: number;
  avgInMs: number;
  minInMs: number;
//  meanInMs: number;
  maxInMs: number;
};
declare type Summary = { [id: string]: SummaryLine | undefined };

const hrTimes: { [id: string]: bigint[] } = {};

export const reset = (): void => {
  for (const id in hrTimes) {
    delete hrTimes[id];
  }
}

export const tick = (id: string): void => {
  const hrTime = process.hrtime.bigint();
  if (id in hrTimes) {
    hrTimes[id].push(hrTime);
  } else {
    hrTimes[id] = [hrTime];
  }
};

const cleanNsToMs = (n: bigint): number =>
  parseFloat((Number(n) / 1e6).toFixed(2));

const summarizeLine = (id: string): SummaryLine | undefined => {
  const times = hrTimes[id];
  if (!times || times.length < 2) {
    return undefined;
  }

  let sum = 0n;
  const count = times.length >> 1;
  let diffs: bigint[] = [];
  for (let i = 0; i < count; i++) {
    const diff = times[i * 2 + 1] - times[i * 2];
    diffs.push(diff);
    sum += diff;
  }
  diffs.sort((a, b) => Number(a - b));

  return {
    sumInMs: cleanNsToMs(sum),
    count: count,
    avgInMs: cleanNsToMs(sum / BigInt(count)),
    minInMs: cleanNsToMs(diffs[0]),
//    meanInMs: cleanNsToMs(diffs[count >> 1]),
    maxInMs: cleanNsToMs(diffs[count - 1]),
  };
};

export const summarize = (id?: string): Summary => {
  const summary: Summary = {};
  if (id) {
    summary[id] = summarizeLine(id);
  } else {
    Object.keys(hrTimes).forEach((id) => (summary[id] = summarizeLine(id)));
  }

  return summary;
};
