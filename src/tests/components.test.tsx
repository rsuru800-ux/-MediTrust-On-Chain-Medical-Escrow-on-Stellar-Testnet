import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { WalletButton } from '../components/WalletButton.tsx';
import { BalanceCard } from '../components/BalanceCard.tsx';

describe('WalletButton Component', () => {
  it('should render Connect Wallet text when disconnected', () => {
    const html = renderToString(
      <WalletButton
        publicKey={null}
        isConnected={false}
        isConnecting={false}
        onConnectClick={() => {}}
        onDisconnectClick={() => {}}
        walletName={null}
      />
    );
    expect(html).toContain('Connect Wallet');
    expect(html).not.toContain('Disconnect');
  });

  it('should render truncated public key and Disconnect button when connected', () => {
    const html = renderToString(
      <WalletButton
        publicKey="GCYLF54XLAH4DFONTJEDZYLILFLCRJRH3DIP2INGOJR2XFBGEYSJLIQ5"
        isConnected={true}
        isConnecting={false}
        onConnectClick={() => {}}
        onDisconnectClick={() => {}}
        walletName="freighter"
      />
    );
    expect(html).toContain('GCYL...LIQ5');
    expect(html).toContain('freighter');
    expect(html).toContain('Disconnect');
  });

  it('should render Connecting spinner when connecting', () => {
    const html = renderToString(
      <WalletButton
        publicKey={null}
        isConnected={false}
        isConnecting={true}
        onConnectClick={() => {}}
        onDisconnectClick={() => {}}
        walletName={null}
      />
    );
    expect(html).toContain('Connecting...');
  });
});

describe('BalanceCard Component', () => {
  it('should display formatting balance with XLM symbol', () => {
    const html = renderToString(
      <BalanceCard
        balance={123.456}
        isFunded={true}
        isFetching={false}
        onRefresh={async () => {}}
        publicKey="GCYLF54XLAH4DFONTJEDZYLILFLCRJRH3DIP2INGOJR2XFBGEYSJLIQ5"
      />
    );
    expect(html).toContain('123.46');
    expect(html).toContain('XLM');
    expect(html).toContain('Active on Stellar Testnet');
  });

  it('should show Friendbot funding alert and button for unfunded accounts', () => {
    const html = renderToString(
      <BalanceCard
        balance={0}
        isFunded={false}
        isFetching={false}
        onRefresh={async () => {}}
        publicKey="GCYLF54XLAH4DFONTJEDZYLILFLCRJRH3DIP2INGOJR2XFBGEYSJLIQ5"
      />
    );
    expect(html).toContain('Account not found on testnet');
    expect(html).toContain('Fund via Friendbot');
  });
});
