import { useCallback, useEffect, useState } from "react";
import { Web3 } from "web3";
import { getContractAbi, getContractAddress } from "./contractConfig";

/**
 * ScholarshipFunding Dashboard
 *
 * Global state machine:
 * - account: connected MetaMask address (null when disconnected)
 * - isAdmin: true when account matches on-chain admin
 * - contractInstance: Web3 contract bound to deployed address + ABI
 * - contractBalance: tracked donation pool (totalDonations from contract)
 */
function App() {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [contractInstance, setContractInstance] = useState(null);
  const [contractBalance, setContractBalance] = useState("0");
  const [adminAddress, setAdminAddress] = useState("");
  const [studentCount, setStudentCount] = useState("0");

  const [donationAmount, setDonationAmount] = useState("");
  const [studentName, setStudentName] = useState("");
  const [releaseRecipient, setReleaseRecipient] = useState("");
  const [releaseAmount, setReleaseAmount] = useState("");

  const [statusMessage, setStatusMessage] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initError, setInitError] = useState("");

  /**
   * Reads on-chain scholarship pool data and syncs React state.
   * Called on wallet connect and after every successful transaction.
   */
  const refreshContractData = useCallback(async (contract, connectedAccount) => {
    if (!contract || !connectedAccount) return;

    // Query cumulative donation pool tracked by the smart contract
    const totalDonationsWei = await contract.methods.totalDonations().call();
    setContractBalance(Web3.utils.fromWei(totalDonationsWei, "ether"));

    // Fetch admin address to determine privileged UI access
    const admin = await contract.methods.admin().call();
    setAdminAddress(admin);
    setIsAdmin(admin.toLowerCase() === connectedAccount.toLowerCase());

    // Optional: show how many students have registered
    const count = await contract.methods.studentCount().call();
    setStudentCount(count.toString());
  }, []);

  /**
   * Instantiates Web3 + contract after MetaMask grants account access.
   */
  const initializeWeb3 = useCallback(
    async (selectedAccount) => {
      const abi = getContractAbi();
      const address = getContractAddress();

      // Construct Web3 provider using the injected MetaMask EIP-1193 object
      const web3Instance = new Web3(window.ethereum);
      setWeb3(web3Instance);

      // Bind compiled ABI to deployed contract address
      const contract = new web3Instance.eth.Contract(abi, address);
      setContractInstance(contract);

      await refreshContractData(contract, selectedAccount);
    },
    [refreshContractData]
  );

  /**
   * Connect Wallet — entry point for MetaMask integration.
   * 1. Verify window.ethereum exists (MetaMask installed)
   * 2. Request account access via eth_requestAccounts
   * 3. Bootstrap Web3 + contract instance
   */
  const connectWallet = async () => {
    setStatusMessage("");
    setInitError("");
    setIsConnecting(true);

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
      }

      // EIP-1193: prompt user to share wallet address(es) with this dApp
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const selectedAccount = accounts[0];
      setAccount(selectedAccount);

      await initializeWeb3(selectedAccount);
      setStatusMessage("Wallet connected successfully.");
    } catch (error) {
      console.error(error);
      setInitError(error.message || "Failed to connect wallet.");
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Donor Portal — sends ETH to the contract's donate() payable function.
   * Converts human-readable ETH string to wei before broadcasting the tx.
   */
  const handleDonate = async () => {
    if (!contractInstance || !account) return;

    setIsSubmitting(true);
    setStatusMessage("Submitting donation transaction…");

    try {
      const weiAmount = Web3.utils.toWei(donationAmount, "ether");

      // Payable call: value field carries the ETH sent alongside the transaction
      await contractInstance.methods.donate().send({
        from: account,
        value: weiAmount,
      });

      setDonationAmount("");
      setStatusMessage("Donation successful! Pool balance updated.");
      await refreshContractData(contractInstance, account);
    } catch (error) {
      console.error(error);
      setStatusMessage(error.message || "Donation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Student Application — registers msg.sender on-chain with a display name.
   */
  const handleApply = async () => {
    if (!contractInstance || !account) return;

    setIsSubmitting(true);
    setStatusMessage("Submitting scholarship application…");

    try {
      await contractInstance.methods.applyForScholarship(studentName).send({
        from: account,
      });

      setStudentName("");
      setStatusMessage("Application submitted successfully!");
      await refreshContractData(contractInstance, account);
    } catch (error) {
      console.error(error);
      setStatusMessage(error.message || "Application failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Administrative Vault — admin-only disbursement via releaseFunds().
   */
  const handleReleaseFunds = async () => {
    if (!contractInstance || !account || !isAdmin) return;

    setIsSubmitting(true);
    setStatusMessage("Releasing scholarship funds…");

    try {
      const weiAmount = Web3.utils.toWei(releaseAmount, "ether");

      await contractInstance.methods
        .releaseFunds(releaseRecipient, weiAmount)
        .send({ from: account });

      setReleaseRecipient("");
      setReleaseAmount("");
      setStatusMessage("Funds released successfully!");
      await refreshContractData(contractInstance, account);
    } catch (error) {
      console.error(error);
      setStatusMessage(error.message || "Fund release failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Re-sync when the user switches accounts inside MetaMask.
   */
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        setAccount(null);
        setIsAdmin(false);
        setContractInstance(null);
        setWeb3(null);
        setContractBalance("0");
        return;
      }

      const nextAccount = accounts[0];
      setAccount(nextAccount);

      if (contractInstance) {
        await refreshContractData(contractInstance, nextAccount);
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [contractInstance, refreshContractData]);

  /**
   * Validate artifact availability on first render (post-compile/migrate).
   */
  useEffect(() => {
    try {
      getContractAddress();
    } catch (error) {
      setInitError(error.message);
    }
  }, []);

  const formatAddress = (address) =>
    address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  /* ─── Login Screen (wallet not connected) ─── */
  if (!account) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-brand-900/30 px-4">
        <div className="card max-w-lg w-full text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600/20 text-3xl">
            🎓
          </div>
          <h1 className="mb-2 text-3xl font-bold text-white">Scholar</h1>
          <p className="mb-8 text-slate-400">
            Decentralized scholarship funding powered by Ethereum. Connect your
            MetaMask wallet to donate, apply, or administer the fund.
          </p>

          {initError && (
            <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-200">
              {initError}
            </div>
          )}

          <button
            type="button"
            onClick={connectWallet}
            disabled={isConnecting}
            className="btn-primary w-full"
          >
            {isConnecting ? "Connecting…" : "Connect Wallet"}
          </button>

          {statusMessage && (
            <p className="mt-4 text-sm text-brand-100">{statusMessage}</p>
          )}
        </div>
      </div>
    );
  }

  /* ─── Dashboard (wallet connected) ─── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-brand-900/20">
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5">
          <div>
            <h1 className="text-2xl font-bold text-white">Scholar Dashboard</h1>
            <p className="text-sm text-slate-400">
              Connected as{" "}
              <span className="font-mono text-brand-100">{formatAddress(account)}</span>
              {isAdmin && (
                <span className="ml-2 rounded-full bg-brand-600/30 px-2 py-0.5 text-xs font-semibold text-brand-100">
                  Admin
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-6 text-right">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Pool Balance</p>
              <p className="text-xl font-bold text-white">{contractBalance} ETH</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Students</p>
              <p className="text-xl font-bold text-white">{studentCount}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {statusMessage && (
          <div className="mb-6 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm text-brand-100">
            {statusMessage}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Donor Portal */}
          <section className="card">
            <h2 className="mb-1 text-lg font-semibold text-white">Donor Portal</h2>
            <p className="mb-5 text-sm text-slate-400">
              Contribute ETH to the scholarship pool. Funds are held in the smart
              contract until released by the admin.
            </p>

            <label className="mb-2 block text-sm font-medium text-slate-300">
              Donation Amount (ETH)
            </label>
            <input
              type="number"
              min="0"
              step="0.001"
              placeholder="0.1"
              value={donationAmount}
              onChange={(e) => setDonationAmount(e.target.value)}
              className="input mb-4"
            />

            <button
              type="button"
              onClick={handleDonate}
              disabled={isSubmitting || !donationAmount || Number(donationAmount) <= 0}
              className="btn-primary w-full"
            >
              Donate
            </button>
          </section>

          {/* Student Application */}
          <section className="card">
            <h2 className="mb-1 text-lg font-semibold text-white">Student Application</h2>
            <p className="mb-5 text-sm text-slate-400">
              Register your wallet as a scholarship applicant. Your connected
              address will be linked to your profile on-chain.
            </p>

            <label className="mb-2 block text-sm font-medium text-slate-300">
              Full Name
            </label>
            <input
              type="text"
              placeholder="Jane Doe"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="input mb-4"
            />

            <button
              type="button"
              onClick={handleApply}
              disabled={isSubmitting || !studentName.trim()}
              className="btn-primary w-full"
            >
              Submit Application
            </button>
          </section>

          {/* Administrative Vault — visible only to deployer/admin */}
          {isAdmin && (
            <section className="card md:col-span-2 border-brand-500/30">
              <div className="mb-5 flex items-center gap-3">
                <span className="rounded-lg bg-brand-600/20 px-3 py-1 text-sm font-semibold text-brand-100">
                  Admin Only
                </span>
                <h2 className="text-lg font-semibold text-white">Administrative Vault</h2>
              </div>

              <p className="mb-5 text-sm text-slate-400">
                Release scholarship funds to a student wallet. Only{" "}
                <span className="font-mono text-brand-100">{formatAddress(adminAddress)}</span>{" "}
                can execute disbursements.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    placeholder="0x…"
                    value={releaseRecipient}
                    onChange={(e) => setReleaseRecipient(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Payout Amount (ETH)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="0.05"
                    value={releaseAmount}
                    onChange={(e) => setReleaseAmount(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleReleaseFunds}
                disabled={
                  isSubmitting ||
                  !releaseRecipient.trim() ||
                  !releaseAmount ||
                  Number(releaseAmount) <= 0
                }
                className="btn-primary mt-4 w-full md:w-auto"
              >
                Release Funds
              </button>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
