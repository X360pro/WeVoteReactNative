import Dispatcher from "../dispatcher/Dispatcher";
import BallotActions from "../actions/BallotActions";
import CookieStore from "./CookieStore";
import FluxMapStore from "flux/lib/FluxMapStore";
import FriendActions from "../actions/FriendActions";
import VoterGuideActions from "../actions/VoterGuideActions";
import BookmarkActions from "../actions/BookmarkActions";
import SupportActions from "../actions/SupportActions";
import VoterActions from "../actions/VoterActions";

export default class VoterStore extends FluxMapStore {

  getInitialState () {
    return {
      voter: {
        interface_status_flags: 0,
      },
      address: {},
      email_address_status: {},
      email_sign_in_status: {},
      facebook_sign_in_status: {},
      voter_found: false,
      voter_donation_history_list: {},
    };
  }

  getVoter (){
    // console.log("VoterStore, this.getState().voter: ", this.getState().voter);
    return this.getState().voter;
  }

  election_id (){
    return this.getState().address.google_civic_election_id;
  }

  getTextForMapSearch (){
    return this.getState().address.text_for_map_search || "";
  }

  getAddressObject (){
    return this.getState().address || {};
  }

  // October 31st 2017, this may be a hack, but it matches the data that comes from the server today.
  // It could be that the Native code fell 3 to 6 months behind most of the WebApp code and the server
  // that Native references is always pretty current.
  getAddressFromObjectOrTextForMapSearch () {
    // There are two different address objects that can be in the VoterStore (unfortunately)
    let addressString = this.getState().address.text_for_map_search || "";
    if (addressString.length === 0) {
      let addressObj = this.getState().address || {};
      if (addressObj !== {} && (typeof addressObj.voterAddressSave != "undefined")) {
        addressString = addressObj.voterAddressSave;
      }
    }
    return addressString;
  }

  getEmailAddressList (){
    return this.getDataFromArr(this.getState().email_address_list) || {};
  }

  getEmailAddressStatus (){
    return this.getState().email_address_status;
  }

  getEmailSignInStatus (){
    return this.getState().email_sign_in_status;
  }

  getFacebookPhoto (){
    return this.getState().voter.facebook_profile_image_url_https || "";
  }

  getFacebookSignInStatus (){
    return this.getState().facebook_sign_in_status;
  }

  getFirstName (){
    return this.getState().voter.first_name || "";
  }

  getLastName (){
    return this.getState().voter.last_name || "";
  }

  getFullName (){
    return this.getState().voter.full_name || "";
  }

  getTwitterHandle (){
    return this.getState().voter.twitter_handle || "";
  }

  // Could be either Facebook photo or Twitter photo
  getVoterPhotoUrlLarge (){
    return this.getState().voter.voter_photo_url_large || "";
  }

    // Could be either Facebook photo or Twitter photo
  getVoterPhotoUrlMedium (){
    return this.getState().voter.voter_photo_url_medium || "";
  }

  // Could be either Facebook photo or Twitter photo
  getVoterPhotoUrlTiny (){
    return this.getState().voter.voter_photo_url_tiny || "";
  }

  // Voter's donation history
  getVoterDonationHistory (){
    return this.getState().voter.voter_donation_history_list;
  }

  // getVoterDeviceId () {
  //   return this.getState().voter.voter_device_id || CookieStore.getItem("voter_device_id");
  // }

  getDataFromArr (arr) {
    if (arr === undefined) {
      return [];
    }
    let data_list = [];
    for (let i = 0, len = arr.length; i < len; i++) {
      data_list.push( arr[i] );
    }
    return data_list;
  }

  getInterfaceFlagState (flag) {
    // Look in js/Constants/VoterConstants.js for list of flag constant definitions
    let interfaceStatusFlags = this.getState().voter.interface_status_flags || 0;
    // return True if bit specified by the flag is also set in interfaceStatusFlags (voter.interface_status_flags)
    // Eg: if interfaceStatusFlags = 5, then we can confirm that bits representing 1 and 4 are set (i.e., 0101)
    // so for value of flag = 1 and 4, we return a positive integer,
    // but, the bit representing 2 and 8 are not set, so for flag = 2 and 8, we return zero
    return interfaceStatusFlags & flag;
  }

  getNotificationSettingsFlagState (flag) {
    // Look in js/Constants/VoterConstants.js for list of flag constant definitions
    let notificationSettingsFlags = this.getState().voter.notification_settings_flags || 0;
    return notificationSettingsFlags & flag;

    // return True if bit specified by the flag is also set
    //  in notificationSettingsFlags (voter.notification_settings_flags)
    // Eg: if interfaceStatusFlags = 5, then we can confirm that bits representing 1 and 4 are set (i.e., 0101)
    // so for value of flag = 1 and 4, we return a positive integer,
    // but, the bit representing 2 and 8 are not set, so for flag = 2 and 8, we return zero
  }

  isVoterFound () {
    return this.getState().voter_found;
  }

  reduce (state, action) {

    let voter_device_id;
    switch (action.type) {
      case "organizationSave":
        // If an organization saves, we want to check to see if it is tied to this voter. If so,
        // refresh the voter data so we have the value linked_organization_we_vote_id in the voter object.
        if (action.res.success) {
          if (action.res.facebook_id === state.voter.facebook_id) {
            VoterActions.voterRetrieve();
          } else {
            let organization_twitter_handle = action.res.organization_twitter_handle !== undefined ? action.res.organization_twitter_handle : "";
            let twitter_screen_name = state.voter.twitter_screen_name !== undefined ? state.voter.twitter_screen_name : "";
            if (organization_twitter_handle && organization_twitter_handle.toLowerCase() === twitter_screen_name.toLowerCase()) {
              VoterActions.voterRetrieve();
            }
          }
        }
        return {
          ...state
        };

      case "organizationSuggestionTasks":
        if (action.res.success) {
          if (action.res.kind_of_follow_task === "FOLLOW_SUGGESTIONS_FROM_TWITTER_IDS_I_FOLLOW") {
            // console.log("organizationSuggestionTasks FOLLOW_SUGGESTIONS_FROM_TWITTER_IDS_I_FOLLOW");
            VoterGuideActions.voterGuidesToFollowRetrieve(this.election_id());
            VoterGuideActions.voterGuidesFollowedRetrieve(this.election_id());
            SupportActions.positionsCountForAllBallotItems(this.election_id());
          } else if (action.res.kind_of_suggestion_task === "UPDATE_SUGGESTIONS_FROM_TWITTER_IDS_I_FOLLOW") {
            // console.log("organizationSuggestionTasks UPDATE_SUGGESTIONS_FROM_TWITTER_IDS_I_FOLLOW");
            VoterGuideActions.voterGuidesToFollowRetrieve(this.election_id());
          }
        }
        return {
          ...state
        };

      case "positionListForVoter":
        if (action.res.show_only_this_election) {
          let position_list_for_one_election = action.res.position_list;
          if (state.voter === undefined) {
            state.voter = {};
          }
          state.voter.position_list_for_one_election = position_list_for_one_election;
        } else if (action.res.show_all_other_elections) {
          let position_list_for_all_except_one_election = action.res.position_list;
          if (state.voter === undefined) {
            state.voter = {};
          }
          state.voter.position_list_for_all_except_one_election = position_list_for_all_except_one_election;
        } else {
          let position_list = action.res.position_list;
          if (state.voter === undefined) {
            state.voter = {};
          }
          state.voter.position_list = position_list;
        }
        return {
          ...state
        };

      case "twitterRetrieveIdsIFollow":
        // console.log("twitterRetrieveIdsIFollow")
        if (action.res.success) {
          VoterActions.organizationSuggestionTasks("UPDATE_SUGGESTIONS_FROM_TWITTER_IDS_I_FOLLOW",
          "FOLLOW_SUGGESTIONS_FROM_TWITTER_IDS_I_FOLLOW");
        }
        return {
          ...state
        };

      case "voterAddressRetrieve":
        state.address = action.res;
        return {
          ...state
        };

      case "voterAddressSave":
        if (action.res.status !== "SIMPLE_ADDRESS_SAVE") {
          BallotActions.voterBallotItemsRetrieve();
          SupportActions.positionsCountForAllBallotItems(action.res.google_civic_election_id);
        }
        state.address = {
          text_for_map_search: action.res.text_for_map_search,
          google_civic_election_id: action.res.google_civic_election_id
        };
        return {
          ...state
        };

      case "voterEmailAddressRetrieve":
        state.email_address_list = action.res.email_address_list;
        return {
          ...state
        };

      case "voterEmailAddressSave":
        VoterActions.voterRetrieve();
        state.email_address_list = action.res.email_address_list;
        state.email_address_status = {
          email_verify_attempted: action.res.email_verify_attempted,
          email_address_already_owned_by_other_voter: action.res.email_address_already_owned_by_other_voter,
          email_address_created: action.res.email_address_created,
          email_address_deleted: action.res.email_address_deleted,
          verification_email_sent: action.res.verification_email_sent,
          link_to_sign_in_email_sent: action.res.link_to_sign_in_email_sent,
        };
        return {
          ...state
        };

      case "voterEmailAddressSignIn":
        VoterActions.voterRetrieve();
        state.email_sign_in_status = {
          email_sign_in_attempted: action.res.email_sign_in_attempted,
          email_ownership_is_verified: action.res.email_ownership_is_verified,
          email_secret_key_belongs_to_this_voter: action.res.email_secret_key_belongs_to_this_voter,
          email_address_found: action.res.email_address_found,
          yes_please_merge_accounts: action.res.yes_please_merge_accounts,
          voter_we_vote_id_from_secret_key: action.res.voter_we_vote_id_from_secret_key,
          voter_merge_two_accounts_attempted: false,
        };
        return {
          ...state
        };

      case "voterEmailAddressVerify":
        VoterActions.voterRetrieve();
        state.email_address_status = {
          email_ownership_is_verified: action.res.email_ownership_is_verified,
          email_secret_key_belongs_to_this_voter: action.res.email_secret_key_belongs_to_this_voter,
          email_verify_attempted: action.res.email_verify_attempted,
          email_address_found: action.res.email_address_found,
        };
        state.email_sign_in_status = {
          email_ownership_is_verified: action.res.email_ownership_is_verified,
          email_secret_key_belongs_to_this_voter: action.res.email_secret_key_belongs_to_this_voter,
          email_sign_in_attempted: action.res.email_verify_attempted,
          email_address_found: action.res.email_address_found,
        };
        return {
          ...state
        };

      case "voterFacebookSaveToCurrentAccount":
        VoterActions.voterRetrieve();
        state.facebook_sign_in_status = {
          facebook_account_created: action.res.facebook_account_created,
        };
        return {
          ...state
        };

      case "voterMergeTwoAccounts":
        // On the server we just switched linked this voter_device_id to a new voter record, so we want to
        //  refresh a lot of data
        VoterActions.voterRetrieve();
        VoterActions.voterEmailAddressRetrieve();
        BookmarkActions.voterAllBookmarksStatusRetrieve();
        FriendActions.currentFriends();
        FriendActions.friendInvitationsSentByMe();
        FriendActions.friendInvitationsSentToMe();
        FriendActions.friendInvitationsProcessed();
        BallotActions.voterBallotItemsRetrieve();
        state.email_sign_in_status = {
          email_ownership_is_verified: true,
          email_secret_key_belongs_to_this_voter: true,
          email_sign_in_attempted: true,
          email_address_found: true,
          yes_please_merge_accounts: false,
          voter_we_vote_id_from_secret_key: "",
          voter_merge_two_accounts_attempted: true,
        };
        state.facebook_sign_in_status = {
          voter_merge_two_accounts_attempted: true,  // TODO DALE is this needed?
        };
        state.twitter_sign_in_status = {
          voter_merge_two_accounts_attempted: true,  // TODO DALE is this needed?
        };
        return {
          ...state
        };

      case "voterRetrieve":
        let current_voter_device_id = CookieStore.getItem("voter_device_id");
        if (!action.res.voter_found) {
          console.log("This voter_device_id is not in the db and is invalid, so delete it: " +
                CookieStore.getItem("voter_device_id"));

          CookieStore.setItem("voter_device_id", "0");  // Quickly clear the cache
          CookieStore.removeItem("voter_device_id");
          // ...and then ask for a new voter. When it returns a voter with a new voter_device_id, we will set new cookie
          VoterActions.voterRetrieve();
        } else {
          voter_device_id = action.res.voter_device_id;
          if (voter_device_id) {
            if (current_voter_device_id !== voter_device_id) {
              console.log("VoterStore Setting new voter_device_id, from ", current_voter_device_id, " to ", voter_device_id );
              CookieStore.setItem("voter_device_id", voter_device_id);
            }
            VoterActions.voterAddressRetrieve(voter_device_id);
          }
        }

        state.voter = action.res;
        state.voter_found = action.res.voter_found;
        return {
          ...state
        };

      case "voterSignOut":
        VoterActions.voterRetrieve();
        VoterActions.voterEmailAddressRetrieve();
        BookmarkActions.voterAllBookmarksStatusRetrieve();
        FriendActions.currentFriends();
        FriendActions.friendInvitationsSentByMe();
        FriendActions.friendInvitationsSentToMe();
        FriendActions.friendInvitationsProcessed();
        BallotActions.voterBallotItemsRetrieve();
        state.email_address_status = {
          email_ownership_is_verified: false,
          email_secret_key_belongs_to_this_voter: false,
          email_verify_attempted: false,
          email_address_found: false
        };
        return {
          ...state
        };

      case "voterTwitterSaveToCurrentAccount":
        VoterActions.voterRetrieve();
        state.twitter_sign_in_status = {
          twitter_account_created: action.res.twitter_account_created,
        };
        return {
          ...state
        };

      case "voterUpdate":
        const {first_name, last_name, email, interface_status_flags, notification_settings_flags, voter_donation_history_list} = action.res;
        if (state.voter === undefined) {
          state.voter = {};
        }
        // With this we are only updating the values we change with a voterUpdate call.
        state.voter.first_name = first_name ? first_name : state.voter.first_name;
        state.voter.last_name = last_name ? last_name : state.voter.last_name;
        state.voter.facebook_email = email ? email : state.voter.email;
        state.voter.interface_status_flags = interface_status_flags ? interface_status_flags : state.voter.interface_status_flags;
        state.voter.notification_settings_flags = notification_settings_flags ? notification_settings_flags : state.voter.notification_settings_flags;
        state.voter.voter_donation_history_list = voter_donation_history_list ? voter_donation_history_list : state.voter.voter_donation_history_list;
        return {
          ...state
        };

      case "error-voterRetrieve" || "error-voterAddressRetrieve" || "error-voterAddressSave":
        console.log(action);
        return {
          ...state
        };

      default:
        return {
          ...state
        };
    }
  }
}

module.exports = new VoterStore(Dispatcher);
