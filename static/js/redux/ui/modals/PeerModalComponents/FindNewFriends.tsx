import React, { useState, useEffect } from "react";
import {
  List,
  ListItem,
  ListItemText,
  Button,
  TextField,
  Box,
  CircularProgress,
  Typography,
} from "@mui/material";
import {
  getFriendRequestsSentEndpoint,
  getSearchFriendsEndpoint,
  getSendFriendRequestEndpoint,
  getWithdrawFriendRequestEndpoint,
} from "../../../constants/endpoints";
import Cookie from "js-cookie";
import { User } from "./Types";

const FindNewFriends = () => {
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [requestSent, setRequestSent] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const fetchFriendRequestsSent = async () => {
      const response = await fetch(getFriendRequestsSentEndpoint());
      const responseJson = await response.json();
      setRequestSent(
        responseJson.reduce((acc, user: User) => ({ ...acc, [user.userId]: true }), {})
      );
    };
    fetchFriendRequestsSent();
  }, []);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (searchTerm === "") {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      const response = await fetch(getSearchFriendsEndpoint(searchTerm));
      const responseJson = await response.json();
      setSearchResults(responseJson);
      setIsSearching(false);
    };
    const delayDebounceFn = setTimeout(fetchSearchResults, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleSendOrWithdrawRequest = async (userId: string) => {
    const endpoint = requestSent[userId]
      ? getWithdrawFriendRequestEndpoint(userId)
      : getSendFriendRequestEndpoint(userId);
    await fetch(endpoint, {
      headers: {
        "X-CSRFToken": Cookie.get("csrftoken"),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
      credentials: "include",
    });
    setRequestSent((prevStatus) => ({ ...prevStatus, [userId]: !prevStatus[userId] }));
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      className="modal-content"
    >
      <Box width="100%" maxWidth={600}>
        <TextField
          label="Search Users"
          variant="outlined"
          value={searchTerm}
          onChange={handleSearchChange}
          margin="normal"
          fullWidth
        />
      </Box>
      {isSearching && <CircularProgress />}
      {!isSearching && searchTerm && searchResults.length > 0 && (
        <List className="modal-content">
          {searchResults.map((user) => (
            <ListItem key={user.userId} style={{ justifyContent: "space-between" }}>
              <ListItemText primary={`${user.first_name} ${user.last_name}`} />
              <Button
                variant="contained"
                color={requestSent[user.userId] ? "primary" : "secondary"}
                onClick={() => handleSendOrWithdrawRequest(user.userId)}
              >
                {requestSent[user.userId] ? "Withdraw Request" : "Send Request"}
              </Button>
            </ListItem>
          ))}
        </List>
      )}
      {!isSearching && searchTerm && !searchResults.length && (
        <Typography align="center" sx={{ mt: 2 }}>
          No users found
        </Typography>
      )}
    </Box>
  );
};

export default FindNewFriends;
