import { BigNumber } from '@ethersproject/bignumber'
import { ChainId } from '@aceswap/sdk'
import aceData from '@aceswap/ace-data'
import { useActiveWeb3React } from 'hooks/useActiveWeb3React'
import { useBoringHelperContract } from 'hooks/useContract'
import _ from 'lodash'
import { useCallback, useEffect, useState } from 'react'
import { exchange, masterchef } from 'apollo/client'
import { getAverageBlockTime } from 'apollo/getAverageBlockTime'
import { liquidityPositionSubsetQuery, pairSubsetQuery, poolsQuery } from 'apollo/queries'
import { POOL_DENY } from '../constants'
import Fraction from '../entities/Fraction'

// Todo: Rewrite in terms of web3 as opposed to subgraph
const useFarms = () => {
    const [farms, setFarms] = useState<any | undefined>()
    const { account } = useActiveWeb3React()
    const boringHelperContract = useBoringHelperContract()

    const fetchAllFarms = useCallback(async () => {
        const results = await Promise.all([
            masterchef.query({
                // results[0]
                query: poolsQuery
            }),
            exchange.query({
                // results[1]
                query: liquidityPositionSubsetQuery,
                variables: { user: '0xb1462e354a652b182994f2d4d10e213ff8401cc1' }
            }),
            getAverageBlockTime(ChainId.MATIC), // results[2]
            aceData.ace.priceUSD(), // results[3]
            // aceData.bentobox.kashiStakedInfo() //results[4]
        ])
        const pools = results[0]?.data.pools
        const pairAddresses = pools
            .map((pool: any) => {
                return pool.pair
            })
            .sort()
        const pairsQuery = await exchange.query({
            query: pairSubsetQuery,
            variables: { pairAddresses }
        })

        const liquidityPositions = results[1]?.data.liquidityPositions
        const averageBlockTime = results[2]
        const acePrice = results[3] || 0.001
        // const kashiPairs = results[4].filter(result => result !== undefined) // filter out undefined (not in onsen) from all kashiPairs

        //console.log('kashiPairs:', kashiPairs)

        const pairs = pairsQuery?.data.pairs
        // const KASHI_PAIRS = _.range(190, 230, 1) // kashiPair pids 189-229

        const farms = pools
            .filter((pool: any) => {
                //console.log(KASHI_PAIRS.includes(Number(pool.id)), pool, Number(pool.id))
                return (
                    !POOL_DENY.includes(pool?.id) &&
                    (pairs.find((pair: any) => pair?.id === pool?.pair))
                )
            })
            .map((pool: any) => {
                if (pool) {
                    const pair = pairs.find((pair: any) => pair.id === pool.pair)
                    const liquidityPosition = liquidityPositions.find(
                        (liquidityPosition: any) => liquidityPosition.pair.id === pair.id
                    )
                    const blocksPerHour = 3600 / averageBlockTime
                    const balance = Number(pool.balance / 1e18) > 0 ? Number(pool.balance / 1e18) : 0.1
                    const totalSupply = pair.totalSupply > 0 ? pair.totalSupply : 0.1
                    const reserveUSD = pair.reserveUSD > 0 ? pair.reserveUSD : 0.1
                    const balanceUSD = (balance / Number(totalSupply)) * Number(reserveUSD)
                    const rewardPerBlock =
                        ((pool.allocPoint / pool.owner.totalAllocPoint) * pool.owner.acePerBlock) / 1e18
                    const roiPerBlock = (rewardPerBlock * acePrice) / balanceUSD
                    const roiPerHour = roiPerBlock * blocksPerHour
                    const roiPerDay = roiPerHour * 24
                    const roiPerMonth = roiPerDay * 30
                    const roiPerYear = roiPerMonth * 12

                    return {
                        ...pool,
                        type: 'ALP',
                        symbol: pair.token0.symbol + '-' + pair.token1.symbol,
                        name: pair.token0.name + ' ' + pair.token1.name,
                        pid: Number(pool.id),
                        pairAddress: pair.id,
                        alpBalance: pool.balance,
                        liquidityPair: pair,
                        roiPerBlock,
                        roiPerHour,
                        roiPerDay,
                        roiPerMonth,
                        roiPerYear,
                        rewardPerThousand: 1 * roiPerDay * (1000 / acePrice),
                        tvl: liquidityPosition?.liquidityTokenBalance
                            ? (pair.reserveUSD / pair.totalSupply) * liquidityPosition.liquidityTokenBalance
                            : 0.1
                    }
                }
            })

        const sorted = _.orderBy(farms, ['pid'], ['desc'])

        const pids = sorted.map((pool: { pid: any }) => {
            return pool.pid
        })

        if (account) {
            const userFarmDetails = await boringHelperContract?.pollPools(account, pids)
            const userFarms = userFarmDetails
                .filter((farm: any) => {
                    return farm.balance.gt(BigNumber.from(0)) || farm.pending.gt(BigNumber.from(0))
                })
                .map((farm: any) => {
                    const pid = farm.pid.toNumber()
                    const farmDetails = sorted.find((pair: any) => pair.pid === pid)

                    let deposited
                    let depositedUSD
                    if (farmDetails && farmDetails.type === 'KMP') {
                        deposited = Fraction.from(
                            farm.balance,
                            BigNumber.from(10).pow(farmDetails.liquidityPair.asset.decimals)
                        ).toString()
                        depositedUSD =
                            farmDetails.totalAssetStaked && farmDetails.totalAssetStaked > 0
                                ? (Number(deposited) * Number(farmDetails.tvl)) / farmDetails.totalAssetStaked
                                : 0
                    } else {
                        deposited = Fraction.from(farm.balance, BigNumber.from(10).pow(18)).toString(18)
                        depositedUSD =
                            farmDetails.alpBalance && Number(farmDetails.alpBalance / 1e18) > 0
                                ? (Number(deposited) * Number(farmDetails.tvl)) / (farmDetails.alpBalance / 1e18)
                                : 0
                    }
                    const pending = Fraction.from(farm.pending, BigNumber.from(10).pow(18)).toString(18)

                    return {
                        ...farmDetails,
                        type: farmDetails.type, // KMP or ALP
                        depositedLP: deposited,
                        depositedUSD: depositedUSD,
                        pendingAce: pending
                    }
                })
            setFarms({ farms: sorted, userFarms: userFarms })
        } else {
            setFarms({ farms: sorted, userFarms: [] })
        }
    }, [account, boringHelperContract])

    useEffect(() => {
        fetchAllFarms()
    }, [fetchAllFarms])

    return farms
}

export default useFarms
