// Node modules
import React, { Component } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

// Components
import Navbar from "./Navbar/Navigation";
import NavbarAdmin from "./Navbar/NavigationAdmin";
import UserHome from "./UserHome";
import StartEnd from "./StartEnd";
import ElectionStatus from "./ElectionStatus";

// Contract
import getWeb3 from "../getWeb3";
import Election from "../contracts/Election.json";

// CSS
import "./Home.css";

// const buttonRef = React.createRef();
export default class Home extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ElectionInstance: undefined,
      account: null,
      web3: null,
      isAdmin: false,
      isOwner: false, // New state for Owner
      elStarted: false,
      elEnded: false,
      elDetails: {},
      demoMode: false,
      viewRole: null, // 'admin' or 'voter'
      electionId: 0,
      newAdminAddress: "", // State for admin transfer
    };
  }

  // refreshing once
  componentDidMount = async () => {
    // Optimized: Removed redundant reload hack
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = Election.networks[networkId];
      const instance = new web3.eth.Contract(
        Election.abi,
        deployedNetwork && deployedNetwork.address
      );

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({
        web3: web3,
        ElectionInstance: instance,
        account: accounts[0],
      });

      const admin = await this.state.ElectionInstance.methods.getAdmin().call();
      if (this.state.account === admin) {
        this.setState({ isAdmin: true });
      }

      // Check if current account is Owner
      const owner = await this.state.ElectionInstance.methods.owner().call();
      if (this.state.account === owner) {
        this.setState({ isOwner: true });
      }

      // Get current electionId
      const electionId = await this.state.ElectionInstance.methods.electionId().call();
      this.setState({ electionId: electionId });

      // Get election start and end values
      const start = await this.state.ElectionInstance.methods.getStart().call();
      this.setState({ elStarted: start });
      const end = await this.state.ElectionInstance.methods.getEnd().call();
      this.setState({ elEnded: end });

      // Getting election details from the contract
      const electionDetails = await this.state.ElectionInstance.methods
        .getElectionDetails()
        .call();

      this.setState({
        elDetails: {
          adminName: electionDetails.adminName,
          adminEmail: electionDetails.adminEmail,
          adminTitle: electionDetails.adminTitle,
          electionTitle: electionDetails.electionTitle,
          organizationTitle: electionDetails.organizationTitle,
        },
      });
    } catch (error) {
      console.error(error);
      // If deployedNetwork is missing, we might be on the wrong network
      this.setState({ web3: "failed" });
    }
  };

  enableDemoMode = () => {
    localStorage.setItem("demoMode", "true");
    this.setState({
      demoMode: true,
      web3: true, // Bypass loading screen
      isAdmin: true,
      elStarted: false,
      elEnded: false,
      account: "0xDEMO_ADMIN_ACCOUNT",
      elDetails: {
        adminName: "Abhay Admin",
        adminEmail: "abhay@example.com",
        adminTitle: "Project Lead",
        electionTitle: "Sample Election",
        organizationTitle: "Team Abhay",
      },
    });
  };

  copyAdminKey = () => {
    const adminKey = "0x77249fb4e7adc23bd4222971acd8154b9f3f7b65fea39fd884def7aa60883782";
    navigator.clipboard.writeText(adminKey);
    alert("Admin Private Key copied to clipboard! Import this into MetaMask.");
  };

  // switch to Sepolia network
  switchNetwork = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }], // Sepolia ID: 11155111
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0xaa36a7",
                chainName: "Sepolia Test Network",
                rpcUrls: ["https://sepolia.infura.io/v3/"],
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
        } catch (addError) {
          console.error(addError);
        }
      }
    }
    window.location.reload();
  };
  // end election
  endElection = async () => {
    await this.state.ElectionInstance.methods
      .endElection()
      .send({ from: this.state.account, gas: 1000000 });
    window.location.reload();
  };
  // register and start election
  registerElection = async (data) => {
    await this.state.ElectionInstance.methods
      .setElectionDetails(
        data.adminFName.toLowerCase() + " " + data.adminLName.toLowerCase(),
        data.adminEmail.toLowerCase(),
        data.adminTitle.toLowerCase(),
        data.electionTitle.toLowerCase(),
        data.organizationTitle.toLowerCase()
      )
      .send({ from: this.state.account, gas: 1000000 });
    window.location.reload();
  };

  // Start a completely new election session (Reset)
  startNewElection = async () => {
    if (!window.confirm(`⚠️ WARNING: Are you sure you want to start Session #${parseInt(this.state.electionId) + 2}?\n\nThis will clear the current dashboard for all voters. Historical data remains on the blockchain, but the UI will reset.`)) {
      return;
    }

    try {
      await this.state.ElectionInstance.methods
        .startNewElection()
        .send({ from: this.state.account, gas: 1000000 });
      window.location.reload();
    } catch (error) {
      console.error("Error starting new election:", error);
      alert("Failed to start a new election. Please try again.");
    }
  };

  transferAdmin = async () => {
    const newAddress = this.state.newAdminAddress.trim();
    if (!this.state.web3.utils.isAddress(newAddress)) {
      alert("Invalid Ethereum address. Please check and try again.");
      return;
    }

    if (!window.confirm(`⚠️ DANGER: Transfer Admin Rights?\n\nYou are about to transfer FULL control of this voting application to:\n${newAddress}\n\nYou will lose your Admin privileges immediately. This action CANNOT be undone.`)) {
      return;
    }

    try {
      await this.state.ElectionInstance.methods
        .setAdmin(newAddress)
        .send({ from: this.state.account, gas: 1000000 });
      alert("Admin rights successfully transferred.");
      window.location.reload();
    } catch (error) {
      console.error("Error transferring admin:", error);
      alert("Failed to transfer admin rights. Please try again.");
    }
  };

  reclaimAdmin = async () => {
    try {
      await this.state.ElectionInstance.methods
        .setAdmin(this.state.account)
        .send({ from: this.state.account, gas: 1000000 });
      alert("Admin rights successfully reclaimed! You are now the Admin again.");
      window.location.reload();
    } catch (error) {
      console.error("Error reclaiming admin:", error);
      alert("Failed to reclaim admin rights.");
    }
  };

  // set view role
  setViewRole = (role) => {
    this.setState({ viewRole: role });
  };

  render() {
    if (!this.state.web3) {
      return (
        <>
          {/* Navbar removed from loading screen for cleaner look */}
          <div className="container-main" style={{ textAlign: "center", marginTop: "30px" }}>
            <div className="loader-container">
              <div className="spinner"></div>
              <h3>Connecting to Blockchain...</h3>
            </div>

            <div className="guide-card">
              <h4>🌍 Public Connection Guide</h4>
              <ul style={{ textAlign: "left", display: "inline-block" }}>
                <li>1. Open your <strong>MetaMask</strong> extension.</li>
                <li>2. Switch to the <strong>Sepolia Test Network</strong>.</li>
                <li>3. Ensure you have some <strong>Sepolia ETH</strong> to vote.</li>
              </ul>
            </div>

            <div style={{ marginTop: "20px" }}>
              <button onClick={this.enableDemoMode} className="btn-demo-main">
                🚀 Skip & View Demo Mode (No Setup Needed)
              </button>
            </div>
          </div>
        </>
      );
    }

    if (this.state.web3 === "failed") {
      return (
        <>
          {/* Navbar removed from failure screen */}
          <div className="container-main" style={{ textAlign: "center", marginTop: "30px" }}>
            <h3 style={{ color: "tomato" }}>⚠️ Connection Failed</h3>
            <p>MetaMask is connected, but we can't find your Smart Contract.</p>

            <div className="troubleshoot-container">
              <div className="troubleshoot-step">
                <strong>Step 1: Correct Network</strong>
                <p>Ensure MetaMask is on "Sepolia Test Network".</p>
                <button onClick={this.switchNetwork} className="btn-action">
                  🔄 Switch to Sepolia
                </button>
              </div>

              <div className="troubleshoot-step">
                <strong>Step 2: No ETH?</strong>
                <p>Voting requires a tiny bit of test ETH for gas.</p>
                <div className="meta-instructions">
                  Visit a <strong>Sepolia Faucet</strong> to get free test money.
                </div>
              </div>

              <div className="troubleshoot-step">
                <strong>Step 3: Admin Access</strong>
                <p>Only the owner of the contract can set up the election.</p>
                <div className="meta-instructions">
                  Ensure your Admin account is selected in MetaMask.
                </div>
              </div>
            </div>

            <div style={{ marginTop: "30px", borderTop: "1px solid #ddd", paddingTop: "20px" }}>
              <p>Just want to see the design?</p>
              <button onClick={this.enableDemoMode} className="btn-demo-secondary">
                View Demo Mode
              </button>
            </div>
          </div>
        </>
      );
    }

    // New Landing Page: Shown after Web3 connects but before main UI
    if (!this.state.viewRole && !this.state.demoMode) {
      return (
        <>
          <div className="landing-container">
            <h1 className="landing-title">Welcome to dVoting</h1>
            <p className="landing-subtitle">Choose your role to get started</p>
            <div className="landing-buttons">
              <div
                className="btn-landing admin"
                onClick={() => this.setViewRole('admin')}
              >
                <div className="btn-icon">👑</div>
                <span>I am an Admin</span>
                <small>Create & Manage Elections</small>
              </div>
              <div
                className="btn-landing voter"
                onClick={() => this.setViewRole('voter')}
              >
                <div className="btn-icon">🗳️</div>
                <span>I am a Voter</span>
                <small>Register & Cast Votes</small>
              </div>
            </div>
            <div style={{ marginTop: "30px" }}>
              <button onClick={this.enableDemoMode} className="btn-demo-secondary">
                ✨ Just View Demo Mode
              </button>
            </div>
          </div>
        </>
      );
    }
    const showAdminUI = (this.state.viewRole === 'admin' || this.state.demoMode) && this.state.isAdmin;
    const showVoterUI = this.state.viewRole === 'voter' || (this.state.demoMode && !this.state.isAdmin);

    return (
      <>
        {this.state.isAdmin ? <NavbarAdmin /> : <Navbar />}
        <div className="container-main">
          {!this.state.demoMode && (
            <button className="btn-back" onClick={() => this.setViewRole(null)}>
              ← Back to Role Choice
            </button>
          )}

          <div className="container-item center-items info">
            {this.state.demoMode ? (
              <strong style={{ color: "#27ae60" }}>✨ DEMO MODE ACTIVE</strong>
            ) : (
              <>
                Your Account: {this.state.account}
                <br />
                Active Role: <span style={{ color: "#3498db", fontWeight: "bold" }}>{this.state.viewRole.toUpperCase()}</span>
              </>
            )}
          </div>


          {!this.state.elStarted && !this.state.elEnded ? (
            <div className="container-item info">
              <center>
                <h3>The election has not been initialized.</h3>
                {showAdminUI ? (
                  <p>Set up the election details below to start.</p>
                ) : (
                  <>
                    <p>The Admin has not yet started the election. Please wait..</p>
                    <button
                      className="btn-switch"
                      onClick={this.switchNetwork}
                      style={{
                        padding: "10px",
                        background: "#f39c12",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                      }}
                    >
                      Switch to Sepolia Network
                    </button>
                  </>
                )}
              </center>
            </div>
          ) : null}
        </div>

        {showAdminUI ? (
          <this.renderAdminHome />
        ) : showVoterUI && this.state.elStarted ? (
          <UserHome el={this.state.elDetails} />
        ) : showVoterUI && this.state.elEnded ? (
          <div className="container-item attention">
            <center>
              <h3>The Election ended.</h3>
              <br />
              <Link to="/Results" style={{ color: "black", textDecoration: "underline" }}>
                See results
              </Link>
            </center>
          </div>
        ) : this.state.viewRole === 'admin' && !this.state.isAdmin ? (
          <div className="container-item attention">
            <center>
              <h3>Unauthorized!</h3>
              <p>Your current wallet address is not the Admin address.</p>
              {this.state.isOwner ? (
                <div style={{ marginTop: "20px", padding: "15px", border: "1px solid #ffcccc", borderRadius: "8px", background: "#fff5f5", maxWidth: "400px" }}>
                  <h4 style={{ color: "tomato", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                    👑 Owner Override
                  </h4>
                  <p style={{ fontSize: "14px", marginBottom: "15px" }}>You are the original Owner of this contract. You can instantly reclaim the Admin role from the current Admin.</p>
                  <button
                    onClick={this.reclaimAdmin}
                    className="btn-main"
                    style={{ background: "#c0392b", color: "white", padding: "10px 20px", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", width: "100%" }}
                  >
                    Reclaim Admin Rights
                  </button>
                </div>
              ) : (
                <p>Please switch to Account #0 in MetaMask or choose <strong>Voter</strong> role.</p>
              )}
            </center>
          </div>
        ) : null}
      </>
    );
  }

  renderAdminHome = () => {
    const EMsg = (props) => {
      return <span style={{ color: "tomato" }}>{props.msg}</span>;
    };

    const AdminHome = () => {
      // Contains of Home page for the Admin
      const {
        handleSubmit,
        register,
        formState: { errors },
      } = useForm();

      const onSubmit = (data) => {
        this.registerElection(data);
      };

      return (
        <div>
          <form onSubmit={handleSubmit(onSubmit)}>
            {!this.state.elStarted & !this.state.elEnded ? (
              <div className="container-main">
                {/* about-admin */}
                <div className="about-admin">
                  <h3>About Admin</h3>
                  <div className="container-item center-items">
                    <div>
                      <label className="label-home">
                        Full Name{" "}
                        {errors.adminFName && <EMsg msg="*required" />}
                        <input
                          className="input-home"
                          type="text"
                          placeholder="First Name"
                          {...register("adminFName", {
                            required: true,
                          })}
                        />
                        <input
                          className="input-home"
                          type="text"
                          placeholder="Last Name"
                          {...register("adminLName")}
                        />
                      </label>

                      <label className="label-home">
                        Email{" "}
                        {errors.adminEmail && (
                          <EMsg msg={errors.adminEmail.message} />
                        )}
                        <input
                          className="input-home"
                          placeholder="eg. you@example.com"
                          name="adminEmail"
                          {...register("adminEmail", {
                            required: "*Required",
                            pattern: {
                              value: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/, // email validation using RegExp
                              message: "*Invalid",
                            },
                          })}
                        />
                      </label>

                      <label className="label-home">
                        Job Title or Position{" "}
                        {errors.adminTitle && <EMsg msg="*required" />}
                        <input
                          className="input-home"
                          type="text"
                          placeholder="eg. HR Head "
                          {...register("adminTitle", {
                            required: true,
                          })}
                        />
                      </label>
                    </div>
                  </div>
                </div>
                {/* about-election */}
                <div className="about-election">
                  <h3>About Election</h3>
                  <div className="container-item center-items">
                    <div>
                      <label className="label-home">
                        Election Title{" "}
                        {errors.electionTitle && <EMsg msg="*required" />}
                        <input
                          className="input-home"
                          type="text"
                          placeholder="eg. School Election"
                          {...register("electionTitle", {
                            required: true,
                          })}
                        />
                      </label>
                      <label className="label-home">
                        Organization Name{" "}
                        {errors.organizationName && <EMsg msg="*required" />}
                        <input
                          className="input-home"
                          type="text"
                          placeholder="eg. Lifeline Academy"
                          {...register("organizationTitle", {
                            required: true,
                          })}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ) : this.state.elStarted ? (
              <UserHome el={this.state.elDetails} />
            ) : null}
            <StartEnd
              elStarted={this.state.elStarted}
              elEnded={this.state.elEnded}
              endElFn={this.endElection}
            />
            <ElectionStatus
              elStarted={this.state.elStarted}
              elEnded={this.state.elEnded}
            />
            {/* Danger Zone: Restart Election or Transfer Admin */}
            <div className="container-main" style={{ borderTop: "2px solid tomato", marginTop: "40px", paddingTop: "20px" }}>
              <h4 style={{ color: "tomato", marginBottom: "20px" }}>🛑 Danger Zone</h4>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", justifyContent: "center" }}>
                {/* Restart Election Block */}
                {this.state.elEnded && (
                  <div style={{ flex: "1", minWidth: "300px", padding: "15px", border: "1px solid #ffcccc", borderRadius: "8px", background: "#fff5f5" }}>
                    <p style={{ margin: "0 0 10px 0", fontSize: "14px" }}>Start a new election session (Session #{parseInt(this.state.electionId) + 2}). This will clear the current dashboard for all users.</p>
                    <button
                      type="button"
                      onClick={this.startNewElection}
                      className="btn-main"
                      style={{ background: "tomato", color: "white", padding: "10px 20px", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", width: "100%" }}
                    >
                      🔄 Restart & Start Session #{parseInt(this.state.electionId) + 2}
                    </button>
                  </div>
                )}

                {/* Transfer Admin Block */}
                <div style={{ flex: "1", minWidth: "300px", padding: "15px", border: "1px solid #ffcccc", borderRadius: "8px", background: "#fff5f5" }}>
                  <p style={{ margin: "0 0 10px 0", fontSize: "14px" }}>Transfer all Admin rights to another wallet. You will lose access immediately.</p>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input
                      type="text"
                      placeholder="New Admin Address (0x...)"
                      value={this.state.newAdminAddress}
                      onChange={(e) => this.setState({ newAdminAddress: e.target.value })}
                      style={{ flex: "1", padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
                    />
                    <button
                      type="button"
                      onClick={this.transferAdmin}
                      className="btn-main"
                      style={{ background: "#c0392b", color: "white", padding: "10px 20px", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
                    >
                      Transfer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      );
    };
    return <AdminHome />;
  };
}
