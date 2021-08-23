# AceSwap Interface

[![Styled With Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io/)

An open source interface for AceSwap -- a protocol for decentralized exchange of Ethereum tokens.

- Website: [aceswap.finance](https://aceswap.finance/)
- Interface: [app.aceswap.finance](https://app.aceswap.finance)
- Docs: [sushiswap.gitbook.io](https://sushiswap.gitbook.io)
- Twitter: [@SushiSwap](https://twitter.com/sushiswap)
- Reddit: [/r/SushiSwap](https://www.reddit.com/r/SushiSwap)
- Discord: [SushiSwap](https://discord.gg/Y7TF6QA)

## Accessing the AceSwap Interface

To access the Sushiswap Interface, use an IPFS gateway link from the
[latest release](https://github.com/sushiswap/sushiswap-interface/releases/latest),
or visit [app.aceswap.finance](https://app.aceswap.finance).

## Listing a token

Please see the
[@aceswap/default-token-list](https://github.com/Ace-Swap/default-token-list)
repository.

## Development

### Install Dependencies

```bash
yarn
```

### Run

```bash
yarn start
```

Note that the interface only works on networks where both
[(Uni|Sushi)swap V2](https://github.com/sushiswap/sushiswap/tree/master/contracts/uniswapv2) and
[multicall](https://github.com/makerdao/multicall) are deployed.
The interface will not work on other networks.

## Contributions

**Please open all pull requests against the `master` branch.**
CI checks will run against all PRs.
