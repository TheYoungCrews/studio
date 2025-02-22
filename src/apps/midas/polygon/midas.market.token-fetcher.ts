import { Inject } from '@nestjs/common';
import { BigNumber, BigNumberish } from 'ethers';

import { APP_TOOLKIT, IAppToolkit } from '~app-toolkit/app-toolkit.interface';
import { PositionTemplate } from '~app-toolkit/decorators/position-template.decorator';

import { FusePoolStruct, MidasMarketTokenFetcher } from '../common/midas.market.token-fetcher';
import { MidasViemContractFactory } from '../contracts';
import { MidasCErc20Token, MidasPoolDirectory, MidasPoolLens } from '../contracts/viem';
import { MidasPoolDirectoryContract } from '../contracts/viem/MidasPoolDirectory';
import { MidasCErc20TokenContract } from '../contracts/viem/MidasCErc20Token';
import { MidasPoolLensContract } from '../contracts/viem/MidasPoolLens';

@PositionTemplate()
export class PolygonMidasMarketTokenFetcher extends MidasMarketTokenFetcher<
  MidasPoolDirectory,
  MidasCErc20Token,
  MidasPoolLens
> {
  groupLabel = 'Lending';

  poolDirectoryAddress = '0x9a161e68ec0d5364f4d09a6080920daff6fff250';
  poolLensAddress = '0xd94ca960132557385e9ad993c69cc22a3344c2e7';

  constructor(
    @Inject(APP_TOOLKIT) protected readonly appToolkit: IAppToolkit,
    @Inject(MidasViemContractFactory) protected readonly midasContractFactory: MidasViemContractFactory,
  ) {
    super(appToolkit);
  }

  getPoolDirectoryContract(address: string): MidasPoolDirectoryContract {
    return this.midasContractFactory.midasPoolDirectory({ address, network: this.network });
  }

  getCTokenContract(address: string): MidasCErc20TokenContract {
    return this.midasContractFactory.midasCErc20Token({ address, network: this.network });
  }

  getPoolLensContract(address: string): MidasPoolLensContract {
    return this.midasContractFactory.midasPoolLens({ address, network: this.network });
  }

  getPools(contract: MidasPoolDirectoryContract): Promise<[BigNumberish[], FusePoolStruct[]]> {
    return contract.read.getActivePools().then(([poolIds, poolStructs]) => [[...poolIds], [...poolStructs]]);
  }

  async getPool(contract: MidasPoolDirectoryContract, poolId: BigNumberish): Promise<FusePoolStruct> {
    const result = await contract.read.pools([BigInt(poolId.toString())]);

    return {
      name: result[0],
      creator: result[1],
      comptroller: result[2],
      blockPosted: result[3],
      timestampPosted: result[4],
    };
  }

  async getMarketTokenAddresses(contract: MidasPoolLensContract, poolAddress: string): Promise<string[]> {
    const assets = await contract.simulate.getPoolAssetsWithData([poolAddress]).then(v => v.result);

    return assets.map(asset => asset.cToken);
  }

  getUnderlyingTokenAddress(contract: MidasCErc20TokenContract): Promise<string> {
    return contract.read.underlying();
  }

  getExchangeRateCurrent(contract: MidasCErc20TokenContract): Promise<BigNumberish> {
    return contract.simulate.exchangeRateCurrent().then(v => v.result);
  }

  getSupplyRateRaw(contract: MidasCErc20TokenContract): Promise<BigNumberish> {
    return contract.read.supplyRatePerBlock();
  }
}
