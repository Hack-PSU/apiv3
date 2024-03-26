import * as jStat from "jstat";

const GAMMA = 0.1;
const KAPPA = 0.0001;
const E: number = Math.E;

function update(
  alpha: number,
  beta: number,
  muWinner: number,
  sigmaSqWinner: number,
  muLoser: number,
  sigmaSqLoser: number,
): [number, number, number, number, number, number] {
  const [updatedAlpha, updatedBeta, _] = updateAnnotator(
    alpha,
    beta,
    muWinner,
    sigmaSqWinner,
    muLoser,
    sigmaSqLoser,
  );
  const [updatedMuWinner, updatedMuLoser] = updateMus(
    alpha,
    beta,
    muWinner,
    sigmaSqWinner,
    muLoser,
    sigmaSqLoser,
  );
  const [updatedSigmaSqWinner, updatedSigmaSqLoser] = updateSigmaSqs(
    alpha,
    beta,
    muWinner,
    sigmaSqWinner,
    muLoser,
    sigmaSqLoser,
  );

  return [
    updatedAlpha,
    updatedBeta,
    updatedMuWinner,
    updatedSigmaSqWinner,
    updatedMuLoser,
    updatedSigmaSqLoser,
  ];
}
function updateAnnotator(
  alpha: number,
  beta: number,
  muWinner: number,
  sigmaSqWinner: number,
  muLoser: number,
  sigmaSqLoser: number,
): [number, number, number] {
  const eMuWinner = E ** muWinner;
  const eMuLoser = E ** muLoser;
  const c1 =
    eMuWinner / (eMuWinner + eMuLoser) +
    (0.5 *
      (sigmaSqWinner + sigmaSqLoser) *
      (eMuWinner * eMuLoser * (eMuLoser - eMuWinner))) /
      (eMuWinner + eMuLoser) ** 3;
  const c2 = 1.0 - c1;
  const c = (c1 * alpha + c2 * beta) / (alpha + beta);

  const expected =
    (c1 * (alpha + 1.0) * alpha + c2 * alpha * beta) /
    (c * (alpha + beta + 1.0) * (alpha + beta));
  const expectedSq =
    (c1 * (alpha + 2.0) * (alpha + 1.0) * alpha +
      c2 * (alpha + 1.0) * alpha * beta) /
    (c * (alpha + beta + 2.0) * (alpha + beta + 1.0) * (alpha + beta));
  const variance = expectedSq - expected ** 2;

  const updatedAlpha = ((expected - expectedSq) * expected) / variance;
  const updatedBeta = ((expected - expectedSq) * (1.0 - expected)) / variance;

  return [updatedAlpha, updatedBeta, c];
}
function updateMus(
  alpha: number,
  beta: number,
  muWinner: number,
  sigmaSqWinner: number,
  muLoser: number,
  sigmaSqLoser: number,
): [number, number] {
  const eMuWinner = E ** muWinner;
  const eMuLoser = E ** muLoser;
  const mult =
    (alpha * eMuWinner) / (alpha * eMuWinner + beta * eMuLoser) -
    eMuWinner / (eMuWinner + eMuLoser);

  const updatedMuWinner = muWinner + mult * sigmaSqWinner;
  const updatedMuLoser = muLoser - mult * sigmaSqLoser;

  return [updatedMuWinner, updatedMuLoser];
}

function updateSigmaSqs(
  alpha: number,
  beta: number,
  muWinner: number,
  sigmaSqWinner: number,
  muLoser: number,
  sigmaSqLoser: number,
): [number, number] {
  const eMuWinner = Math.exp(muWinner);
  const eMuLoser = Math.exp(muLoser);
  const mult =
    (alpha * eMuWinner * beta * eMuLoser) /
      Math.pow(alpha * eMuWinner + beta * eMuLoser, 2) -
    (eMuWinner * eMuLoser) / Math.pow(eMuWinner + eMuLoser, 2);

  const updatedSigmaSqWinner =
    sigmaSqWinner * Math.max(1.0 + mult * sigmaSqWinner, KAPPA);
  const updatedSigmaSqLoser =
    sigmaSqLoser * Math.max(1.0 + mult * sigmaSqLoser, KAPPA);

  return [updatedSigmaSqWinner, updatedSigmaSqLoser];
}

function divergenceGaussian(
  mu1: number,
  sigmaSq1: number,
  mu2: number,
  sigmaSq2: number,
): number {
  const sigmaRatio = sigmaSq1 / sigmaSq2;
  const leftTerm = Math.pow(mu1 - mu2, 2) / (2.0 * sigmaSq2);
  const rightTerm = (sigmaRatio - 1.0 - Math.log(sigmaRatio)) / 2.0;
  return leftTerm + rightTerm;
}

function divergenceBeta(
  alpha1: number,
  beta1: number,
  alpha2: number,
  beta2: number,
): number {
  const lnTerm = jStat.betafn(alpha2, beta2) - jStat.betafn(alpha1, beta1);
  const aTerm = (alpha1 - alpha2) * jStat.digamma(alpha1);
  const bTerm = (beta1 - beta2) * jStat.digamma(beta1);
  const abTerm =
    (alpha2 - alpha1 + beta2 - beta1) * jStat.digamma(alpha1 + beta1);
  return lnTerm + aTerm + bTerm + abTerm;
}

function expectedInformationGain(
  alpha: number,
  beta: number,
  muA: number,
  sigmaSqA: number,
  muB: number,
  sigmaSqB: number,
): number {
  const [alpha1, beta1, c] = updateAnnotator(
    alpha,
    beta,
    muA,
    sigmaSqA,
    muB,
    sigmaSqB,
  );
  const [muA1, muB1] = updateMus(alpha, beta, muA, sigmaSqA, muB, sigmaSqB);
  const [sigmaSqA1, sigmaSqB1] = updateSigmaSqs(
    alpha,
    beta,
    muA,
    sigmaSqA,
    muB,
    sigmaSqB,
  );
  const probARankedAbove = c;

  const [alpha2, beta2, _] = updateAnnotator(
    alpha,
    beta,
    muB,
    sigmaSqB,
    muA,
    sigmaSqA,
  );
  const [muB2, muA2] = updateMus(alpha, beta, muB, sigmaSqB, muA, sigmaSqA);
  const [sigmaSqB2, sigmaSqA2] = updateSigmaSqs(
    alpha,
    beta,
    muB,
    sigmaSqB,
    muA,
    sigmaSqA,
  );

  return (
    probARankedAbove *
      (divergenceGaussian(muA1, sigmaSqA1, muA, sigmaSqA) +
        divergenceGaussian(muB1, sigmaSqB1, muB, sigmaSqB) +
        GAMMA * divergenceBeta(alpha1, beta1, alpha, beta)) +
    (1.0 - probARankedAbove) *
      (divergenceGaussian(muA2, sigmaSqA2, muA, sigmaSqA) +
        divergenceGaussian(muB2, sigmaSqB2, muB, sigmaSqB) +
        GAMMA * divergenceBeta(alpha2, beta2, alpha, beta))
  );
}

describe("update function tests", () => {
  test("should correctly update parameters", () => {
    const alpha = 20.0;
    const beta = 12.2;
    const muWinner = 4.2;
    const sigmaSqWinner = 1.0;
    const muLoser = 3.11;
    const sigmaSqLoser = 0.65;

    // Values obtained from running the original Rust code
    const expectedAlpha = 20.29342378562617;
    const expectedBeta = 12.144888310192417;
    const expectedMuWinner = 4.28143039999674;
    const expectedSigmaSqWinner = 0.9529174440716865;
    const expectedMuLoser = 3.057070240002119;
    const expectedSigmaSqLoser = 0.6301076201202875;

    const [
      updatedAlpha,
      updatedBeta,
      updatedMuWinner,
      updatedSigmaSqWinner,
      updatedMuLoser,
      updatedSigmaSqLoser,
    ] = update(alpha, beta, muWinner, sigmaSqWinner, muLoser, sigmaSqLoser);

    expect(updatedAlpha).toBe(expectedAlpha);
    expect(updatedBeta).toBe(expectedBeta);
    expect(updatedMuWinner).toBe(expectedMuWinner);
    expect(updatedSigmaSqWinner).toBe(expectedSigmaSqWinner);
    expect(updatedMuLoser).toBe(expectedMuLoser);
    expect(updatedSigmaSqLoser).toBe(expectedSigmaSqLoser);
  });
});
