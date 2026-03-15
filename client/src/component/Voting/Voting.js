// Node modules
import React, { Component } from "react";
import { Link } from "react-router-dom";

// Components
import Navbar from "../Navbar/Navigation";
import NavbarAdmin from "../Navbar/NavigationAdmin";
import NotInit from "../NotInit";

// Contract
import getWeb3 from "../../getWeb3";
import Election from "../../contracts/Election.json";

// CSS
import "./Voting.css";

export default class Voting extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ElectionInstance: undefined,
      account: null,
      web3: null,
      isAdmin: false,
      candidateCount: undefined,
      candidates: [],
      isElStarted: false,
      isElEnded: false,
      currentVoter: {
        address: undefined,
        name: null,
        phone: null,
        hasVoted: false,
        isVerified: false,
        isRegistered: false,
      },
      demoMode: false,
    };
  }
  componentDidMount = async () => {
    // Optimized: Removed redundant window.location.reload() hack
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

      // Get current electionId
      const electionId = await instance.methods.electionId().call();
      this.setState({ electionId: electionId });

      // Get total number of candidates for this session
      const candidateCount = await this.state.ElectionInstance.methods
        .candidateCount(electionId)
        .call();
      this.setState({ candidateCount: candidateCount });
      
      const start = await this.state.ElectionInstance.methods.start(electionId).call();
      this.setState({ isElStarted: start });
      const end = await this.state.ElectionInstance.methods.end(electionId).call();
      this.setState({ isElEnded: end });

      // Optimized:      // Optimized: Loading Candidates details in parallel
      const candidates = await Promise.all(
        Array.from({ length: candidateCount }, (_, i) => 
          this.state.ElectionInstance.methods.candidateDetails(electionId, i).call()
        )
      );

      this.setState({ candidates: candidates.map(c => ({
        id: c.candidateId,
        header: c.header,
        slogan: c.slogan,
      })) });

      // Loading current voter for this session
      const voter = await this.state.ElectionInstance.methods
        .voterDetails(electionId, this.state.account)
        .call();
      this.setState({
        currentVoter: {
          address: voter.voterAddress,
          name: voter.name,
          phone: voter.phone,
          hasVoted: voter.hasVoted,
          isVerified: voter.isVerified,
          isRegistered: voter.isRegistered,
        },
      });

      // Admin account and verification
      const admin = await this.state.ElectionInstance.methods.getAdmin().call();
      if (this.state.account === admin) {
        this.setState({ isAdmin: true });
      }
    } catch (error) {
      // Check for demo mode
      if (localStorage.getItem("demoMode") === "true") {
        this.setState({
          demoMode: true,
          web3: true,
          isAdmin: false,
          isElStarted: true,
          isElEnded: false,
          candidateCount: 2,
          candidates: [
            { id: 0, header: "Candidate 1", slogan: "Vote for progress!" },
            { id: 1, header: "Candidate 2", slogan: "A better future for all." },
          ],
          currentVoter: {
            address: "0xDEMO_VOTER_ACCOUNT",
            name: "Demo User",
            phone: "9876543210",
            hasVoted: false,
            isVerified: true,
            isRegistered: true,
          },
          account: "0xDEMO_VOTER_ACCOUNT",
        });
        return;
      }
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
      console.error(error);
    }
  };

  renderCandidates = (candidate) => {
    const castVote = async (id) => {
      await this.state.ElectionInstance.methods
        .vote(id)
        .send({ from: this.state.account, gas: 1000000 });
      window.location.reload();
    };
    const confirmVote = (id, header) => {
      var r = window.confirm(
        "Vote for " + header + " with Id " + id + ".\nAre you sure?"
      );
      if (r === true) {
        castVote(id);
      }
    };
    return (
      <div className="container-item">
        <div className="candidate-info">
          <h2>
            {candidate.header} <small>#{candidate.id}</small>
          </h2>
          <p className="slogan">{candidate.slogan}</p>
        </div>
        <div className="vote-btn-container">
          <button
            onClick={() => confirmVote(candidate.id, candidate.header)}
            className="vote-bth"
            disabled={
              !this.state.currentVoter.isRegistered ||
              !this.state.currentVoter.isVerified ||
              this.state.currentVoter.hasVoted
            }
          >
            Vote
          </button>
        </div>
      </div>
    );
  };

  render() {
    if (!this.state.web3) {
      return (
        <>
          {this.state.isAdmin ? <NavbarAdmin /> : <Navbar />}
          <div className="container-main" style={{ textAlign: "center", marginTop: "50px" }}>
            <center>Loading Web3, accounts, and contract...</center>
            <div style={{ marginTop: "20px" }}>
              <button
                onClick={() => {
                  localStorage.setItem("demoMode", "true");
                  window.location.reload();
                }}
                style={{ padding: "10px 20px", backgroundColor: "#2ecc71", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
              >
                🚀 View Demo Mode
              </button>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        {this.state.isAdmin ? <NavbarAdmin /> : <Navbar />}
        <div>
          {!this.state.isElStarted && !this.state.isElEnded ? (
            <NotInit />
          ) : this.state.isElStarted && !this.state.isElEnded ? (
            <>
              {this.state.currentVoter.isRegistered ? (
                this.state.currentVoter.isVerified ? (
                  this.state.currentVoter.hasVoted ? (
                    <div className="container-item success">
                      <div>
                        <strong>You've casted your vote.</strong>
                        <p />
                        <center>
                          <Link
                            to="/Results"
                            style={{
                              color: "black",
                              textDecoration: "underline",
                            }}
                          >
                            See Results
                          </Link>
                        </center>
                      </div>
                    </div>
                  ) : (
                    <div className="container-item info">
                      <center>Go ahead and cast your vote.</center>
                    </div>
                  )
                ) : (
                  <div className="container-item attention">
                    <center>Please wait for admin to verify.</center>
                  </div>
                )
              ) : (
                <>
                  <div className="container-item attention">
                    <center>
                      <p>You're not registered. Please register first.</p>
                      <br />
                      <Link
                        to="/Registration"
                        style={{ color: "black", textDecoration: "underline" }}
                      >
                        Registration Page
                      </Link>
                    </center>
                  </div>
                </>
              )}
              <div className="container-main">
                <h2>Candidates</h2>
                <small>Total candidates: {this.state.candidates.length}</small>
                {this.state.candidates.length < 1 ? (
                  <div className="container-item attention">
                    <center>Not one to vote for.</center>
                  </div>
                ) : (
                  <>
                    {this.state.candidates.map(this.renderCandidates)}
                    <div
                      className="container-item"
                      style={{ border: "1px solid black" }}
                    >
                      <center>That is all.</center>
                    </div>
                  </>
                )}
              </div>
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
        </div>
      </>
    );
  }
}
