import React, { useState, useEffect } from 'react';
import styles from './App.module.css';
import { useWallet } from './hooks/useWallet.ts';
import { fetchXlmBalance } from './lib/stellar.ts';
import { WalletButton } from './components/WalletButton.tsx';
import { WalletSelectModal } from './components/WalletSelectModal.tsx';
import { BalanceCard } from './components/BalanceCard.tsx';
import { SendPayment } from './components/SendPayment.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { ClaimsPortal } from './components/ClaimsPortal.tsx';
import { SettlementView } from './components/SettlementView.tsx';
import { ClaimsList } from './components/ClaimsList.tsx';
import { FeedbackWidget } from './components/FeedbackWidget.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { getLogs, clearLogs, LogEntry } from './utils/analytics.ts';

type TabType = 'escrows' | 'payment' | 'analytics' | 'claims' | 'settlement' | 'claims-list' | 'history';

export const App: React.FC = () => {
  const {
    publicKey,
    walletName,
    isConnected,
    isConnecting,
    isFreighterInstalled,
    isModalOpen,
    error: walletError,
    openModal,
    closeModal,
    connectWithProvider,
    disconnect,
    signTransaction,
  } = useWallet();

  const [activeTab, setActiveTab] = useState<TabType>('escrows');
  const [balance, setBalance] = useState<number>(0);
  const [isFunded, setIsFunded] = useState<boolean>(true);
  const [isFetchingBalance, setIsFetchingBalance] = useState<boolean>(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Local audit logs for analytics panel
  const [auditLogs, setAuditLogs] = useState<LogEntry[]>([]);

  const handleFetchBalance = async () => {
    if (!publicKey) return;
    setIsFetchingBalance(true);
    setBalanceError(null);
    try {
      const result = await fetchXlmBalance(publicKey);
      setBalance(result.balance);
      setIsFunded(result.isFunded);
    } catch (e: any) {
      setBalanceError('Failed to fetch native XLM balance from Horizon server.');
    } finally {
      setIsFetchingBalance(false);
    }
  };

  useEffect(() => {
    if (isConnected && publicKey) {
      handleFetchBalance();
    } else {
      setBalance(0);
      setIsFunded(true);
    }
  }, [isConnected, publicKey]);

  // Load audit logs when active tab is analytics or history
  useEffect(() => {
    if (activeTab === 'analytics' || activeTab === 'history') {
      setAuditLogs(getLogs());
    }
  }, [activeTab]);

  const handleClearLogs = () => {
    clearLogs();
    setAuditLogs([]);
  };

  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 'escrows': return 'Search medical escrows...';
      case 'payment': return 'Search transactions...';
      case 'claims': return 'Search insurance claims...';
      default: return 'Search...';
    }
  };

  const getAvatarInitials = () => {
    if (!publicKey) return 'U';
    return publicKey.slice(1, 3).toUpperCase();
  };

  return (
    <ErrorBoundary>
      <div className={styles.appLayout}>
        {/* Left Sidebar Layout */}
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <div className={styles.logoText}>
              <span>🛡️</span> MediTrust
            </div>
            <span className={styles.logoTagline}>On-chain Security</span>
          </div>

          <nav className={styles.navLinks}>
            <button
              className={`${styles.navTab} ${activeTab === 'escrows' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('escrows')}
            >
              🩺 Escrows Directory
            </button>
            <button
              className={`${styles.navTab} ${activeTab === 'payment' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('payment')}
            >
              💸 Direct Payment
            </button>
            <button
              className={`${styles.navTab} ${activeTab === 'claims' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('claims')}
            >
              🏥 Claims Portal
            </button>
            <button
              className={`${styles.navTab} ${activeTab === 'settlement' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('settlement')}
            >
              🏥 Settlement View
            </button>
            <button
              className={`${styles.navTab} ${activeTab === 'claims-list' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('claims-list')}
            >
              🏥 Claims List
            </button>
            <button
              className={`${styles.navTab} ${activeTab === 'history' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('history')}
            >
              🩺 History Timeline
            </button>
            <button
              className={`${styles.navTab} ${activeTab === 'analytics' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              📊 Telemetry Logs
            </button>
          </nav>

          <div className={styles.sidebarBottom}>
            <button
              className={styles.newEscrowBtn}
              onClick={() => {
                setActiveTab('escrows');
                // Scroll to creator form if rendered
                const formEl = document.getElementById('initialize-escrow-form');
                if (formEl) {
                  formEl.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              ➕ New Escrow
            </button>
            <a
              href="https://github.com/stellar/js-stellar-sdk"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.helpCenterLink}
            >
              ℹ️ Help Center
            </a>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className={styles.mainWrapper}>
          {/* Top Bar Navigation */}
          <header className={styles.topBar}>
            <div className={styles.searchContainer}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder={getSearchPlaceholder()}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={styles.topBarActions}>
              <button className={styles.notificationBell} title="Notifications">
                🔔
              </button>
              
              <WalletButton
                publicKey={publicKey}
                isConnected={isConnected}
                isConnecting={isConnecting}
                onConnectClick={openModal}
                onDisconnectClick={disconnect}
                walletName={walletName}
              />

              {isConnected && (
                <div className={styles.userProfile}>
                  <div className={styles.avatar}>{getAvatarInitials()}</div>
                  <span className={styles.userName}>Patient / Admin</span>
                </div>
              )}
            </div>
          </header>

          {/* Page Content mounting */}
          <main className={styles.contentArea}>
            {isConnected && publicKey ? (
              <div>
                {/* Financial Health Header */}
                <div className={styles.financialHealthHeader}>
                  <h1 className={styles.pageTitle}>
                    {activeTab === 'escrows' && 'Clinical Escrows'}
                    {activeTab === 'payment' && 'Direct Payouts'}
                    {activeTab === 'claims' && 'Insurance Claims Portal'}
                    {activeTab === 'settlement' && 'Provider Settlement View'}
                    {activeTab === 'claims-list' && 'Insurance Claims Directory'}
                    {activeTab === 'history' && 'Medical History Timeline'}
                    {activeTab === 'analytics' && 'System Telemetry Logs'}
                  </h1>
                  <p className={styles.pageSubtitle}>
                    {activeTab === 'escrows' && 'Deploy, deposit, and settle single-purpose on-chain medical escrows.'}
                    {activeTab === 'payment' && 'Send instant native XLM transfers directly to active provider addresses.'}
                    {activeTab === 'claims' && 'Submit copays and deductibles to lock on-chain insurance approvals.'}
                    {activeTab === 'settlement' && 'Hospital balance reconciliations, pending payouts, and settlements.'}
                    {activeTab === 'claims-list' && 'Complete record of insurance filings and on-chain verification tags.'}
                    {activeTab === 'history' && 'Audit timeline of all clinical procedures and state-transition transactions.'}
                    {activeTab === 'analytics' && 'Privacy-preserving Plausible and Sentry diagnostic events stored locally.'}
                  </p>
                </div>

                {/* Left side metrics summaries in dashboard layout */}
                {activeTab === 'escrows' && (
                  <div className={styles.summaryGrid}>
                    <BalanceCard
                      balance={balance}
                      isFunded={isFunded}
                      isFetching={isFetchingBalance}
                      onRefresh={handleFetchBalance}
                      publicKey={publicKey}
                    />

                    <div className={styles.highlightCard}>
                      <div className={styles.cardTitle}>Total Escrowed Value</div>
                      <div className={styles.cardValue}>-- XLM</div>
                      <div className={styles.cardSubtext}>Active patient deposits in contract instances</div>
                    </div>

                    <div className={styles.customCard}>
                      <div className={styles.cardTitle}>Stellar Network Status</div>
                      <div className={styles.cardValue} style={{ fontSize: '20px', marginTop: '8px', color: 'var(--status-success-color)' }}>
                        🟢 Active (Testnet)
                      </div>
                      <div className={styles.cardSubtext}>Linked to Horizon & Soroban RPC servers</div>
                    </div>
                  </div>
                )}

                {balanceError && (
                  <div className={styles.errorAlert}>
                    ⚠️ {balanceError}
                  </div>
                )}
                
                {walletError && (
                  <div className={styles.errorAlert}>
                    ❌ Wallet error: {walletError.message}
                  </div>
                )}

                {/* Tab Views */}
                {activeTab === 'escrows' && (
                  <Dashboard
                    senderPublicKey={publicKey}
                    signTransaction={signTransaction}
                    onBalanceRefresh={handleFetchBalance}
                  />
                )}

                {activeTab === 'payment' && (
                  <SendPayment
                    senderPublicKey={publicKey}
                    balance={balance}
                    signTransaction={signTransaction}
                    onPaymentSuccess={handleFetchBalance}
                  />
                )}

                {activeTab === 'claims' && (
                  <ClaimsPortal
                    senderPublicKey={publicKey}
                    signTransaction={signTransaction}
                    onBalanceRefresh={handleFetchBalance}
                    onNavigateToEscrows={() => setActiveTab('escrows')}
                  />
                )}

                {activeTab === 'settlement' && (
                  <SettlementView
                    senderPublicKey={publicKey}
                    signTransaction={signTransaction}
                    onBalanceRefresh={handleFetchBalance}
                  />
                )}

                {activeTab === 'claims-list' && (
                  <ClaimsList
                    senderPublicKey={publicKey}
                    signTransaction={signTransaction}
                    onBalanceRefresh={handleFetchBalance}
                  />
                )}

                {activeTab === 'history' && (
                  <div className={styles.customCard}>
                    <h3 className={styles.sectionHeader}>On-chain Clinical History Timeline</h3>
                    <p className={styles.pageSubtitle}>
                      Vertical timeline audit trace generated from local telemetry actions and transaction events.
                    </p>
                    
                    <div className={styles.timelineWrapper}>
                      {auditLogs.length === 0 ? (
                        <p className={styles.noLogs}>No timeline records found. Settle or deploy escrows to populate.</p>
                      ) : (
                        auditLogs
                          .slice()
                          .reverse()
                          .map((log, idx) => (
                            <div key={idx} className={styles.timelineItem}>
                              <div className={styles.timelineIndicator}>
                                {log.type === 'error' ? '❌' : '🩺'}
                              </div>
                              <div className={styles.timelineContent}>
                                <div className={styles.timelineHeader}>
                                  <span className={styles.logName}>{log.name}</span>
                                  <span className={styles.timelineTime}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <div className={styles.timelineText}>
                                  {log.type === 'error' ? 'Operation failed check:' : 'Action registered on-chain:'} {JSON.stringify(log.metadata || {})}
                                </div>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'analytics' && (
                  <div className={styles.analyticsPanel}>
                    <div className={styles.analyticsHeader}>
                      <h3 className={styles.panelTitle}>Privacy-Preserving Telemetry Logs</h3>
                      <button className={styles.clearBtn} onClick={handleClearLogs}>
                        🗑️ Clear Logs
                      </button>
                    </div>
                    <p className={styles.panelDesc}>
                      Below is the local structured diagnostic log generated by user actions and network events, simulating Plausible analytics and Sentry monitoring.
                    </p>
                    <div className={styles.logList}>
                      {auditLogs.length === 0 ? (
                        <p className={styles.noLogs}>No logs recorded in this browser session yet.</p>
                      ) : (
                        auditLogs
                          .slice()
                          .reverse()
                          .map((log, idx) => (
                            <div key={idx} className={`${styles.logItem} ${log.type === 'error' ? styles.errorLog : ''}`}>
                              <span className={styles.logTime}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                              <span className={styles.logTag}>{log.type.toUpperCase()}</span>
                              <span className={styles.logName}>{log.name}</span>
                              {log.metadata && (
                                <pre className={styles.logMeta}>{JSON.stringify(log.metadata, null, 2)}</pre>
                              )}
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Disconnected Landing Page */
              <div className={styles.landingPage}>
                <div className={styles.landingHero}>
                  <h1 className={styles.heroTitle}>
                    Secure, On-chain <br />
                    <span className={styles.heroGradient}>Medical Bill Escrow</span>
                  </h1>
                  <p className={styles.heroSubtitle}>
                    MediTrust locks medical treatment costs in smart escrows on Stellar. 
                    Protecting patient funds and guaranteeing provider payments with decentralized dispute mediation.
                  </p>
                  <div className={styles.ctaGroup}>
                    <button className={styles.ctaButton} onClick={openModal}>
                      Connect Wallet to Begin Treatment Payment Flow
                    </button>
                  </div>
                  {!isFreighterInstalled && (
                    <p className={styles.freighterWarning}>
                      ⚠️ Freighter extension is not detected. Click connect to install it or use an alternative wallet.
                    </p>
                  )}
                </div>

                <div className={styles.featuresRow}>
                  <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>🛡️</div>
                    <h3 className={styles.featureTitle}>Trustless Escrow</h3>
                    <p className={styles.featureText}>
                      Patients deposit funds into individual, locked treatment escrows. Payouts are drawn down as care is delivered.
                    </p>
                  </div>
                  <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>⚖️</div>
                    <h3 className={styles.featureTitle}>Dispute Mediation</h3>
                    <p className={styles.featureText}>
                      If insurance claims are disputed, funds remain frozen in the contract until resolved by a neutral arbiter.
                    </p>
                  </div>
                  <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>🌐</div>
                    <h3 className={styles.featureTitle}>Multi-Wallet Kit</h3>
                    <p className={styles.featureText}>
                      Integrates Freighter, xBull, and Albedo wallets seamlessly via Stellar Wallets Kit.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Footer */}
          <footer className={styles.footer}>
            <div>&copy; {new Date().getFullYear()} MediTrust. Secure on-chain escrow powered by Stellar Soroban.</div>
          </footer>
        </div>

        {/* Custom Wallet Modal */}
        <WalletSelectModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSelect={connectWithProvider}
          isFreighterInstalled={isFreighterInstalled}
        />

        {/* Floating Feedback Form */}
        <FeedbackWidget userAddress={publicKey} />
      </div>
    </ErrorBoundary>
  );
};
export default App;
