/**
 * Loads the compiled Truffle artifact for ScholarshipFunding.
 * Run `npm run compile && npm run migrate` from the project root first.
 */
import ScholarshipFundingArtifact from "@contracts/ScholarshipFunding.json";

const NETWORK_ID = "5777";

/**
 * Resolves the deployed contract address for the local Ganache network.
 * Truffle stores addresses keyed by network id inside the artifact JSON.
 */
export function getContractAddress() {
  const networks = ScholarshipFundingArtifact.networks || {};
  const deployment =
    networks[NETWORK_ID] ||
    Object.values(networks).find((entry) => entry && entry.address);

  if (!deployment || !deployment.address) {
    throw new Error(
      "ScholarshipFunding is not deployed. Start Ganache on port 7545, then run: npm run migrate"
    );
  }

  return deployment.address;
}

export function getContractAbi() {
  return ScholarshipFundingArtifact.abi;
}

export { ScholarshipFundingArtifact };
