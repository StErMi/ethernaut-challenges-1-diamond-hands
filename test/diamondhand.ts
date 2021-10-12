import {BigNumber, utils} from 'ethers';
import {ethers, waffle} from 'hardhat';
import chai from 'chai';

import DiamondHandArtifact from '../artifacts/contracts/DiamondHand.sol/DiamondHand.json';
import {DiamondHand} from '../typechain/DiamondHand';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

const {deployContract} = waffle;
const {expect} = chai;

const TWO_YEARS_IN_SECONDS = 2 * 365 * 60 * 60 * 24;

// Utilities methods
const increaseWorldTimeInSeconds = async (seconds: number, mine = false) => {
  await ethers.provider.send('evm_increaseTime', [seconds]);
  if (mine) {
    await ethers.provider.send('evm_mine', []);
  }
};

describe('DiamondHand Contract', () => {
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let diamondHand: DiamondHand;

  beforeEach(async () => {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    diamondHand = (await deployContract(owner, DiamondHandArtifact)) as DiamondHand;
  });

  describe('Test deposit', () => {
    it('deposit 0 eth', async () => {
      const tx = diamondHand.connect(addr1).deposit({
        value: ethers.utils.parseEther('0'),
      });

      await expect(tx).to.be.revertedWith('You need to lock at least some ETH');
    });

    it('deposit success', async () => {
      const unlockTime = Math.round(new Date().getTime() / 1000) + TWO_YEARS_IN_SECONDS;
      const depositAmount = ethers.utils.parseEther('1');
      const txDeposit = await diamondHand.connect(addr1).deposit({
        value: depositAmount,
      });

      const diamond = await diamondHand.getDiamond(addr1.address);
      expect(diamond.owner).to.equal(addr1.address);
      expect(diamond.amount).to.equal(depositAmount);
      expect(diamond.unlockTimestamp).to.closeTo(BigNumber.from(unlockTime), 60);

      // check balance change
      await expect(txDeposit).to.changeEtherBalances([diamondHand, addr1], [depositAmount, depositAmount.mul(-1)]);
    });

    it('deposit second time', async () => {
      const depositAmount = ethers.utils.parseEther('1');
      await diamondHand.connect(addr1).deposit({
        value: depositAmount,
      });

      const firstDeposit = await diamondHand.getDiamond(addr1.address);

      const depositAmount2 = ethers.utils.parseEther('9');
      const txDeposit = await diamondHand.connect(addr1).deposit({
        value: depositAmount2,
      });

      const secondDeposit = await diamondHand.getDiamond(addr1.address);
      expect(secondDeposit.owner).to.equal(addr1.address);
      expect(secondDeposit.amount).to.equal(depositAmount.add(depositAmount2));
      expect(secondDeposit.unlockTimestamp).to.gte(firstDeposit.unlockTimestamp);

      // check balance change
      await expect(txDeposit).to.changeEtherBalances([diamondHand, addr1], [depositAmount2, depositAmount2.mul(-1)]);
    });
  });

  describe('Test withdraw', () => {
    it('No balance to withdraw', async () => {
      const tx = diamondHand.connect(addr1).withdraw();

      await expect(tx).to.be.revertedWith('Your diamond has not enough balance to send');
    });

    it("Diamond locked, can't withdraw", async () => {
      const depositAmount = ethers.utils.parseEther('1');
      await diamondHand.connect(addr1).deposit({
        value: depositAmount,
      });

      const tx = diamondHand.connect(addr1).withdraw();

      await expect(tx).to.be.revertedWith('Your diamond is still locked');
    });

    it('Diamond unlocked yeah', async () => {
      const depositAmount = ethers.utils.parseEther('1');
      await diamondHand.connect(addr1).deposit({
        value: depositAmount,
      });

      increaseWorldTimeInSeconds(TWO_YEARS_IN_SECONDS, true);

      const txWithdraw = await diamondHand.connect(addr1).withdraw();

      const diamond = await diamondHand.getDiamond(addr1.address);
      expect(diamond.amount).to.equal(0);

      // check balance change
      await expect(txWithdraw).to.changeEtherBalances([diamondHand, addr1], [depositAmount.mul(-1), depositAmount]);
    });
  });
});
