const { HDKey } = require('ethereum-cryptography/hdkey');
const { mnemonicToSeedSync } = require('ethereum-cryptography/bip39');
const { publicToAddress, toChecksumAddress } = require('ethereumjs-util');
const { secp256k1 } = require('ethereum-cryptography/secp256k1');

const mnemonic = 'brownie';
const seed = mnemonicToSeedSync(mnemonic);
const hdkey = HDKey.fromMasterSeed(seed);

console.log('Available Accounts:');
for (let i = 0; i < 10; i++) {
    const child = hdkey.derive(`m/44'/60'/0'/0/${i}`);
    const address = toChecksumAddress('0x' + Buffer.from(publicToAddress(Buffer.from(secp256k1.getPublicKey(child.privateKey, false)).slice(1), true)).toString('hex'));
    console.log(`(${i}) ${address} (0x${Buffer.from(child.privateKey).toString('hex')})`);
}
