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
      elStarted: false,
      elEnded: false,
      elDetails: {},
      demoMode: false,
    };
  }

  // refreshing once
  componentDidMount = async () => {
    if (!window.location.hash) {
      window.location = window.location + "#loaded";
      window.location.reload();
    }
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

};

copyAdminKey = () => {
  const adminKey = "0x77249fb4e7adc23bd4222971acd8154b9f3f7b65fea39fd884def7aa60883782";
  navigator.clipboard.writeText(adminKey);
  alert("Admin Private Key copied to clipboard! Import this into MetaMask.");
};

// switch to ganache network
switchNetwork = async () => {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x539" }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x539",
              chainName: "Ganache Local",
              rpcUrls: ["http://127.0.0.1:8545"],
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
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

render() {
  if (!this.state.web3) {
    return (
      <>
        <Navbar />
        <div className="container-main" style={{ textAlign: "center", marginTop: "30px" }}>
          <div className="loader-container">
            <div className="spinner"></div>
            <h3>Connecting to Blockchain...</h3>
          </div>

          <div className="guide-card">
            <h4>🛠️ Quick Connection Guide</h4>
            <ul style={{ textAlign: "left", display: "inline-block" }}>
              <li>1. Open <strong>Ganache</strong> (make sure it says "Listening on 127.0.0.1:8545")</li>
              <li>2. Open <strong>MetaMask</strong> and unlock it.</li>
              <li>3. Ensure MetaMask is on <strong>Ganache Local</strong> (ID 1337).</li>
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
        <Navbar />
        <div className="container-main" style={{ textAlign: "center", marginTop: "30px" }}>
          <h3 style={{ color: "tomato" }}>⚠️ Connection Failed</h3>
          <p>MetaMask is connected, but we can't find your Smart Contract.</p>

          <div className="troubleshoot-container">
            <div className="troubleshoot-step">
              <strong>Step 1: Check Network</strong>
              <p>Ensure MetaMask is on "Ganache Local" (Chain ID 1337).</p>
              <button onClick={this.switchNetwork} className="btn-action">
                🔄 Auto-Switch Network
              </button>
            </div>

            <div className="troubleshoot-step">
              <strong>Step 2: Fix "Out of Sync" Error</strong>
              <p>If Ganache was restarted, MetaMask gets stuck. Fix it here:</p>
              <div className="meta-instructions">
                  MetaMask > Settings > Advanced > <strong>Clear activity tab data</strong>
              </div>
            </div>

            <div className="troubleshoot-step">
              <strong>Step 3: Admin Access</strong>
              <p>Need to log in as Admin? Import the first account from Ganache.</p>
              <button onClick={this.copyAdminKey} className="btn-action-alt">
                📋 Copy Admin Private Key
              </button>
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
  return (
    <>
      {this.state.isAdmin ? <NavbarAdmin /> : <Navbar />}
      <div className="container-main">
        <div className="container-item center-items info">
          {this.state.demoMode ? (
            <strong style={{ color: "#27ae60" }}>✨ DEMO MODE ACTIVE</strong>
          ) : (
            <>Your Account: {this.state.account}</>
          )}
        </div>
        {!this.state.elStarted & !this.state.elEnded ? (
          <div className="container-item info">
            <center>
              <h3>The election has not been initialize.</h3>
              {this.state.isAdmin ? (
                <p>Set up the election.</p>
              ) : (
                <>
                  <p>Please wait..</p>
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
                    Switch to Ganache Network
                  </button>
                </>
              )}
            </center>
          </div>
        ) : null}
      </div>
      {this.state.isAdmin ? (
        <>
          <this.renderAdminHome />
        </>
      ) : this.state.elStarted ? (
        <>
          <UserHome el={this.state.elDetails} />
        </>
      ) : !this.state.isElStarted && this.state.isElEnded ? (
        <>
          <div className="container-item attention">
            <center>
              <h3>The Election ended.</h3>
              <br />
              <Link
                to="/Results"
                style={{ color: "black", textDecoration: "underline" }}
              >
                See results
              </Link>
            </center>
          </div>
        </>
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
        </form>
      </div>
    );
  };
  return <AdminHome />;
};
}
