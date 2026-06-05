# Scholar — Decentralized Scholarship Funding

A monorepo with a Solidity smart contract backend (Truffle) and a React/Vite frontend connected via Web3.js and MetaMask.

## Project Structure

```
/contracts          — Solidity source files
/migrations         — Truffle deployment scripts
/frontend           — React + Vite dashboard
/build              — Compiled contract artifacts (generated)
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Ganache](https://trufflesuite.com/ganache/) (GUI or CLI) on `127.0.0.1:7545`
- [MetaMask](https://metamask.io/) browser extension

## Setup

### 1. Install dependencies

```bash
npm install
cd frontend && npm install && cd ..
```

### 2. Start Ganache

Launch Ganache with RPC server on **127.0.0.1:7545** (default Ganache GUI port).

### 3. Compile & deploy contracts

```bash
npm run compile
npm run migrate
```

### 4. Configure MetaMask

1. Add a custom network pointing to `http://127.0.0.1:7545` (chain ID **5777** for Ganache).
2. Import one of Ganache's test accounts using its private key.

### 5. Run the frontend

```bash
npm run dev:frontend
```

Open `http://localhost:5173`, click **Connect Wallet**, and interact with the dashboard.

## Smart Contract

`contracts/ScholarshipFunding.sol` exposes:

| Function | Access | Description |
|----------|--------|-------------|
| `donate()` | Public (payable) | Accept ETH donations |
| `applyForScholarship(name)` | Public | Register student profile |
| `releaseFunds(recipient, amount)` | Admin only | Disburse scholarship funds |

## Development Scripts

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile Solidity contracts |
| `npm run migrate` | Deploy to local Ganache |
| `npm run migrate:reset` | Redeploy from scratch |
| `npm run dev:frontend` | Start Vite dev server |
