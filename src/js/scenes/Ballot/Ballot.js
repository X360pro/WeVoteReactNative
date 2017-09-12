import React, { Component, PropTypes } from "react";
import {
  StyleSheet,
  Switch,
  ScrollView,
  Text,
  Modal,
  Slider,
  Button,
  View,
  Image,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import { styles } from "../More/SignIn";
//import { Modal, Button, OverlayTrigger, Tooltip } from "react-bootstrap";
import { browserHistory, Link } from "react-router-native";
//import AddressBox from "../../components/AddressBox";
import BallotActions from "../../actions/BallotActions";
//import BallotElectionList from "../../components/Ballot/BallotElectionList";
import BallotItemCompressed from "../../components/Ballot/BallotItemCompressed";
import BallotItemReadyToVote from "../../components/Ballot/BallotItemReadyToVote";
//import BallotIntroMission from "../../components/Ballot/BallotIntroMission";
//import BallotIntroFollowIssues from "../../components/Ballot/BallotIntroFollowIssues";
//import BallotIntroFollowAdvisers from "../../components/Ballot/BallotIntroFollowAdvisers";
//import BallotIntroPositionBar from "../../components/Ballot/BallotIntroPositionBar";
import BallotStore from "../../stores/BallotStore";
import BallotFilter from "../../components/Navigation/BallotFilter";
//import BrowserPushMessage from "../../components/Widgets/BrowserPushMessage";
import EditAddress from "../../components/Widgets/EditAddress";
import GuideActions from "../../actions/GuideActions";
//import GuideList from "../../components/VoterGuide/GuideList";
import GuideStore from "../../stores/GuideStore";
//import Helmet from "react-helmet";
//import ItemSupportOpposeCounts from "../../components/Widgets/ItemSupportOpposeCounts";
//import ItemTinyPositionBreakdownList from "../../components/Position/ItemTinyPositionBreakdownList";
import LoadingWheel from "../../components/LoadingWheel";
//import Slider from "react-slick";
import SupportActions from "../../actions/SupportActions";
import SupportStore from "../../stores/SupportStore";
import VoterStore from "../../stores/VoterStore";
import VoterActions from "../../actions/VoterActions";
import VoterConstants from "../../constants/VoterConstants";

const web_app_config = require("../../config");

export default class Ballot extends Component {
  static propTypes = {
    location: PropTypes.object
  };

  constructor (props){
    super(props);
    this.state = {
      candidate_for_modal: {
        voter_guides_to_follow_for_latest_ballot_item: [],
        position_list: []
      },
      measure_for_modal: {
        voter_guides_to_follow_for_latest_ballot_item: [],
        position_list: []
      },
      showBallotIntroModal: !VoterStore.getInterfaceFlagState(VoterConstants.BALLOT_INTRO_MODAL_SHOWN),
      showCandidateModal: false,
      showMeasureModal: false,
      showSelectBallotModal: false,
      showSelectAddressModal: false,
      showBallotSummaryModal: false,
      ballotElectionList: [],
      mounted: false,
    };

    this._toggleBallotIntroModal = this._toggleBallotIntroModal.bind(this);
    this._toggleCandidateModal = this._toggleCandidateModal.bind(this);
    this._toggleMeasureModal = this._toggleMeasureModal.bind(this);
    this._toggleSelectBallotModal = this._toggleSelectBallotModal.bind(this);
    this._toggleSelectAddressModal = this._toggleSelectAddressModal.bind(this);
    this._toggleBallotSummaryModal = this._toggleBallotSummaryModal.bind(this);
  }

  componentDidMount () {
    this.setState({mounted: true});
    if (BallotStore.ballot_properties && BallotStore.ballot_properties.ballot_found === false){ // No ballot found
      browserHistory.push("settings/location");
    } else {
      let ballot = this.getBallot(this.props);
      if (ballot !== undefined) {
        let ballot_type = "all";
        this.setState({ballot: ballot, ballot_type: ballot_type});
      }
      // We need a ballotStoreListener here because we want the ballot to display before positions are received
      this.ballotStoreListener = BallotStore.addListener(this._onBallotStoreChange.bind(this));
      // NOTE: voterAllPositionsRetrieve and positionsCountForAllBallotItems are also called in SupportStore when voterAddressRetrieve is received,
      // so we get duplicate calls when you come straight to the Ballot page. There is no easy way around this currently.
      SupportActions.voterAllPositionsRetrieve();
      SupportActions.positionsCountForAllBallotItems();
      BallotActions.voterBallotListRetrieve();
      this.guideStoreListener = GuideStore.addListener(this._onGuideStoreChange.bind(this));
      this.supportStoreListener = SupportStore.addListener(this._onBallotStoreChange.bind(this));
      this._onVoterStoreChange(); // We call this to properly set showBallotIntroModal
      this.voterStoreListener = VoterStore.addListener(this._onVoterStoreChange.bind(this));
    }
  }

  componentWillUnmount (){
    this.setState({mounted: false});
    if (BallotStore.ballot_properties && BallotStore.ballot_properties.ballot_found === false){
      // No ballot found
    } else {
      this.ballotStoreListener.remove();
      this.guideStoreListener.remove();
      this.supportStoreListener.remove();
      this.voterStoreListener.remove();
    }
  }

  componentWillReceiveProps (nextProps){
    let ballot_type = "all";
    this.setState({ballot: this.getBallot(nextProps), ballot_type: ballot_type });
  }

  _toggleCandidateModal (candidate_for_modal) {
    if (candidate_for_modal) {
      GuideActions.retrieveGuidesToFollowByBallotItem(candidate_for_modal.we_vote_id, "CANDIDATE");
      candidate_for_modal.voter_guides_to_follow_for_latest_ballot_item = GuideStore.getVoterGuidesToFollowForBallotItemId(candidate_for_modal.we_vote_id);
    }

    this.setState({
      candidate_for_modal: candidate_for_modal,
      showCandidateModal: !this.state.showCandidateModal
    });
  }

  _toggleBallotIntroModal () {
    if (this.state.showBallotIntroModal) {
      // Saved to the voter record that the ballot introduction has been seen
      VoterActions.voterUpdateInterfaceStatusFlags(VoterConstants.BALLOT_INTRO_MODAL_SHOWN);
    } else {
      // Clear out any # from anchors in the URL
      this.props.navigator.redirect("/ballot");
    }
    this.setState({ showBallotIntroModal: !this.state.showBallotIntroModal });
  }

  _toggleMeasureModal (measureForModal) {
    if (measureForModal) {
      GuideActions.retrieveGuidesToFollowByBallotItem(measureForModal.measure_we_vote_id, "MEASURE");
    }
    this.setState({
      measure_for_modal: measureForModal,
      showMeasureModal: !this.state.showMeasureModal
    });
  }

  _toggleSelectBallotModal () {
    this.setState({
      showSelectBallotModal: !this.state.showSelectBallotModal
    });
  }

  _toggleSelectAddressModal () {
    // Clear out any # from anchors in the URL
    //if (!this.state.showSelectAddressModal)
    //  browserHistory.push("/ballot");

    this.setState({
      showSelectAddressModal: !this.state.showSelectAddressModal
    });
  }

  _toggleBallotSummaryModal () {
    this.setState({
      showBallotSummaryModal: !this.state.showBallotSummaryModal
    });
  }

  _onVoterStoreChange () {
    if (this.state.mounted) {
      this.setState({
        voter: VoterStore.getVoter(),
        showBallotIntroModal: !VoterStore.getInterfaceFlagState(VoterConstants.BALLOT_INTRO_MODAL_SHOWN),
      });
    }
  }

  _onBallotStoreChange (){
    if (this.state.mounted) {
      if (BallotStore.ballot_properties && BallotStore.ballot_properties.ballot_found && BallotStore.ballot && BallotStore.ballot.length === 0) { // Ballot is found but ballot is empty
        browserHistory.push("ballot/empty");
      } else {
        //let ballot_type = this.props.location.query ? this.props.location.query.type : "all";
        let ballot_type = "all";
        this.setState({ballot: this.getBallot(this.props), ballot_type: ballot_type});
      }
      this.setState({ballotElectionList: BallotStore.ballotList()});
    }
  }

  _onGuideStoreChange (){
    // Update the data for the modal to include the position of the organization related to this ballot item
    if (this.state.candidate_for_modal) {
      this.setState({
        candidate_for_modal: {
          ...this.state.candidate_for_modal,
          voter_guides_to_follow_for_latest_ballot_item: GuideStore.getVoterGuidesToFollowForLatestBallotItem()
        }
      });
    } else if (this.state.measure_for_modal) {
      this.setState({
        measure_for_modal: {
          ...this.state.measure_for_modal,
          voter_guides_to_follow_for_latest_ballot_item: GuideStore.getVoterGuidesToFollowForLatestBallotItem()
        }
      });
    }
  }

//  componentDidUpdate (){
//    this.hashLinkScroll();
//  }

  // Needed to scroll to anchor tags based on hash in url (as done for bookmarks)
  hashLinkScroll () {
    const { hash } = window.location;
    if (hash !== "") {
      // Push onto callback queue so it runs after the DOM is updated,
      // this is required when navigating from a different page so that
      // the element is rendered on the page before trying to getElementById.
      setTimeout(() => {
        let id = hash.replace("#", "");
        const element = document.getElementById(id);
        if (element) element.scrollIntoView();
      }, 0);
    }
  }

  getBallot (props){
    let ballot_type = "all";
    switch (ballot_type) {
      case "filterRemaining":
        return BallotStore.ballot_remaining_choices;
      case "filterSupport":
        return BallotStore.ballot_supported;
      case "filterReadyToVote":
        return BallotStore.ballot;
      default :
        return BallotStore.ballot;
    }
  }

  getBallotType (){
    switch (this.state.ballot_type) {
      case "filterRemaining":
        return "CHOICES_REMAINING";
      case "filterSupport":
        return "WHAT_I_SUPPORT";
      case "filterReadyToVote":
        return "READY_TO_VOTE";
      default :
        return "ALL_BALLOT_ITEMS";
    }
  }

  getFilterType (){
    switch (this.state.ballot_type) {
      case "filterRemaining":
        return "filterRemaining";
      case "filterSupport":
        return "filterSupport";
      case "filterReadyToVote":
        return "filterReadyToVote";
      default :
        return "none";
    }
  }

  emptyMsg (){
    switch (this.state.ballot_type) {
      case "filterRemaining":
        return "You already chose a candidate or position for each ballot item";
      case "filterSupport":
        return "You haven't supported any candidates or measures yet.";
      default :
        return "";
    }
  }

  render () {
    if (!this.state.mounted) {
        return null;
    }

    let ballot = this.state.ballot;
    let text_for_map_search = VoterStore.getTextForMapSearch();
    let voter_address_object = VoterStore.getAddressObject();

    if (!ballot) {
      if (text_for_map_search.length === 0) {
        return <View className="ballot">

          <View className="ballot__header">

            <Text>
              Your ballot could not be found. Please change your address.
            </Text>
          </View>
        </View>;
      } else {
        // console.log("Loading Wheel " + "voter_address " + voter_address + " ballot " + ballot + " location " + this.props.location);
        return <View className="ballot">
            <View className="ballot__header">
              <Text>
                Your ballot could not be found. Please change your address.
              </Text>
              {LoadingWheel}
            </View>
          </View>;
      }
    }

    const missing_address = false;
    //const missing_address = this.props.location === null;
    // const ballot_caveat = BallotStore.ballot_properties.ballot_caveat;
    const election_name = BallotStore.currentBallotElectionName;
    const election_date = BallotStore.currentBallotElectionDate;
    const polling_location_we_vote_id_source = BallotStore.currentBallotPollingLocationSource;
    let ballot_returned_admin_edit_url = web_app_config.WE_VOTE_SERVER_ROOT_URL + "b/" + polling_location_we_vote_id_source + "/list_edit_by_polling_location/?google_civic_election_id=" + VoterStore.election_id() + "&state_code=";

    const emptyBallotButton = this.getFilterType() !== "none" && !missing_address ?
        <TouchableOpacity onPress={browserHistory.push('/ballot')}>
          <Text style = {styles.buttonText}>View Full Ballot</Text>
        </TouchableOpacity> :
        <Link to="/settings/location">Enter a Different Address</Link>;
        /*<TouchableOpacity onPress={browserHistory.push('/settings/location')}>
          <Text style = {styles.buttonText}>Enter a Different Address</Text>
        </TouchableOpacity>;*/

    const emptyBallot = ballot.length === 0 ?
      <View className="container-fluid well u-stack--md u-inset--md">
        {emptyBallotButton}
      </View> :
      null;

    const electionTooltip = election_date ?
        <View style={{position: 'absolute'}}>
            <Text>Ballot for {election_date}</Text>
        </View> : <Text />;

    //let in_ready_to_vote_mode = this.getFilterType() === "filterReadyToVote";
    let in_ready_to_vote_mode = false;

    return <View>
      <View className="ballot">
        { this.state.showBallotIntroModal ? <BallotIntroModal show={this.state.showBallotIntroModal} toggleFunction={this._toggleBallotIntroModal} /> : null }
        { this.state.showMeasureModal ? <MeasureModal show={this.state.showMeasureModal} toggleFunction={this._toggleMeasureModal} measure={this.state.measure_for_modal}/> : null }
        { this.state.showCandidateModal ? <CandidateModal show={this.state.showCandidateModal} toggleFunction={this._toggleCandidateModal} candidate={this.state.candidate_for_modal}/> : null }
        { this.state.showSelectBallotModal ? <SelectBallotModal show={this.state.showSelectBallotModal} toggleFunction={this._toggleSelectBallotModal} ballotElectionList={this.state.ballotElectionList} /> : null }
        { this.state.showSelectAddressModal ? <SelectAddressModal show={this.state.showSelectAddressModal} toggleFunction={this._toggleSelectAddressModal} /> : null }
        { this.state.showBallotSummaryModal ? <BallotSummaryModal show={this.state.showBallotSummaryModal} toggleFunction={this._toggleBallotSummaryModal} /> : null }
      </View>

      <View className="ballot__heading u-stack--lg">
        { election_name ?
          /*<OverlayTrigger placement="top" overlay={electionTooltip} >*/
            <View>
               <Text style={styles.title}> {election_name} </Text>
               {this.state.ballotElectionList.length > 1 ? <Image source={require("../../../img/global/icons/gear-icon.png")}/> : null}
          </View> :
          null }

        <View>
        <EditAddress address={voter_address_object} _toggleSelectAddressModal={this._toggleSelectAddressModal} />
        </View>
        {text_for_map_search ?
            <BallotFilter ballot_type={this.getBallotType()} _toggleBallotIntroModal={this._toggleBallotIntroModal} /> :
          null
        }
        <View className="visible-xs-block hidden-print">
          <View className="BallotItemsSummary">
            <Text style = {{fontSize: 15, color: '#48BBEC'}} onPress={this._toggleBallotSummaryModal}>Summary of Ballot Items</Text>
          </View>
        </View>
      </View>
      {emptyBallot}
      <View className="BallotList">
        { in_ready_to_vote_mode ?
          ballot.map( (item) => <View>
            <BallotItemReadyToVote key={item.we_vote_id} {...item} />
          </View>) :
          ballot.map( (item) => <View>
            <BallotItemCompressed _toggleCandidateModal={this._toggleCandidateModal}
                                                      _toggleMeasureModal={this._toggleMeasureModal}
                                                      key={item.we_vote_id}
                                                      {...item} />
          </View>)
        }
        {/* in_ready_to_vote_mode ?
          ballot.map( (item) => <Text> {item.ballot_item_display_name}</Text> ) : null
        */}

      </View>

    </View>;
  }
}