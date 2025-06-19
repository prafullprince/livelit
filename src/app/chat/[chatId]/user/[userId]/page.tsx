/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";
import {
  fetchMessage,
  fetchOtherUser,
  fetchUserDetailsById,
} from "@/service/apiCall/chat.api";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { redirect, useParams, usePathname, useRouter } from "next/navigation";
import React, { memo, useEffect, useRef, useState } from "react";
import fallbackImage from "@/assets/Screenshot 2025-02-03 at 23.53.50.png";
import wspLogo from "../../../../../../public/assets/wssupLogo.png";
import {
  IoArrowBackSharp,
  IoCallOutline,
  IoCallSharp,
  IoSendSharp,
  IoVideocamOutline,
} from "react-icons/io5";
import toast from "react-hot-toast";
import SendMoneyModal from "@/components/Chat/SendMoneyModal";
import Receiver from "@/components/Chat/Message/Receiver";
import Sender from "@/components/Chat/Message/Sender";
import { useDispatch } from "react-redux";
import { setOpenChatMobile } from "@/redux/slice/chat.slice";
import { AnimatePresence, motion } from "framer-motion";
import { FaVideo } from "react-icons/fa";
import { SlCallEnd } from "react-icons/sl";
import socket from "@/utills/socket";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  ControlBar,
  useTracks,
  TrackReferenceOrPlaceholder,
  useRoomContext,
  useLocalParticipant,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { MdCallEnd, MdKeyboardVoice, MdMicOff } from "react-icons/md";
import { LuCamera, LuCameraOff } from "react-icons/lu";
import { IoMdExit } from "react-icons/io";

// Define types for better maintainability
interface Message {
  _id: string;
  text: any;
  sender: string;
  receiver: string;
  type: string;
  createdAt: string;
  isSeen: boolean;
  order?: string;
}

interface User {
  _id: string;
  username: string;
  image: string;
}

// ChatPage
const Page = () => {
  // hooks
  const { chatId, userId } = useParams();
  const { data: session } = useSession();
  const divRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const router = useRouter();
  const chatRef = useRef<string>("");
  const dispatch = useDispatch();

  // state
  const [userDetails, setUserDetails] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [refreshButton, setRefreshButton] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [seenMessage, setSeenMessage] = useState(false);

  // call state
  const [token, setToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<null | any>(null);
  console.log("token", token);
  const [isCallStart, setIsCallStart] = useState(false);
  const [incomingCall, setIncomingCall] = useState<null | any>(null);
  const [inCall, setInCall] = useState(false);
  console.log("incomingCall", incomingCall);
  console.log("inCall", inCall);
  console.log("isCallStart", isCallStart);
  console.log("roomName", roomName);
  console.log("roomNamesss:   ", localStorage.getItem("roomName"));

  // handleVideoCall
  const handleVideoCall = async () => {
    console.log("videoCall");

    // validation
    if (incomingCall || !token || !chatId || !userId || !userDetails || inCall)
      return;
    if (!socket.connected) socket.connect();

    // process
    setIsCallStart(true);
    setRoomName(chatId);
    localStorage.setItem("roomName", JSON.stringify(chatId));

    // send to socket
    socket.emit("startCall", {
      to: userId,
      from: userDetails?._id,
      room: chatId,
    });
  };

  // handleAccept
  const handleAccept = async () => {
    // validation
    if (!incomingCall || !token || !chatId || !userId || !userDetails || inCall)
      return;

    // process
    setRoomName(incomingCall.room);
    localStorage.setItem("roomName", JSON.stringify(incomingCall.room));
    // send sender to acknowledgement that you accepted the call
    socket.emit("inCall", { to: userId, room: chatId });
    toast.success("Call Started");
    setInCall(true);
    setIncomingCall(null);
  };

  // handleReject
  const handleReject = () => {
    if(!incomingCall) return;
    setIncomingCall(null);
    
    // send other user to acknowledgement that you declined the call
    socket.emit("declined", { to: userId, room: chatId });
  };

  // handleEndCall
  const handleEndCall = () => {
    if (incomingCall) return;
    setRoomName(null);
    localStorage.removeItem("roomName");
    setInCall(false);
    setIncomingCall(null);

    // send other user to acknowledgement that you declined the call
    socket.emit("endCall", { to: userId, room: chatId });
    toast.success("Call Ended");
  };

  // sendMessage
  const sendMessage = () => {
    // validation
    const message = chatRef.current.trim();
    if (!message) return;
    if (!socket.connected) socket.connect();
    setMsgLoading(true);

    // msg payload
    const messagePayload = {
      chatId: chatId,
      sender: userDetails?._id,
      receiver: userId,
      text: message,
      type: "text",
    };

    // send message
    socket.emit("sendMessage", messagePayload);

    chatRef.current = ""; // clear ref manually
    const inputElement = document.querySelector<HTMLInputElement>("input");
    if (inputElement) inputElement.value = ""; // clear UI input
  };

  // Handle Enter Key for Sending Message
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
      chatRef.current = "";
    }
  };

  // Fetch User Details
  const fetchUserDetails = async () => {
    try {
      const response = await fetchUserDetailsById(session?.serverToken);
      setUserDetails(response);
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  // Fetch Other User
  const fetchOtherUsers = async () => {
    try {
      const response = await fetchOtherUser(userId);
      setOtherUser(response);
    } catch (error) {
      console.error("Error fetching other user:", error);
    }
  };

  // Fetch Messages
  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await fetchMessage(chatId, session?.serverToken);
      setMessages(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  // Api call -> messages, other user
  useEffect(() => {
    if (!chatId || !session || !userId) return;
    fetchMessages();
    fetchOtherUsers();
  }, [chatId, session?.serverToken, refreshButton, userId]);

  // Api call -> fetch user details
  useEffect(() => {
    if (!session) return;
    fetchUserDetails();
  }, [session?.serverToken]);

  // handle socket connection
  useEffect(() => {
    if (!userDetails || !chatId) return;

    // handle connect
    const handleConnect = () => {
      // registerUserInChat
      socket.emit("registerUserInChat", {
        chatId: chatId,
        userId: userDetails._id,
      });
    };

    // handle disconnect
    const handleDisconnect = () => {
      console.log("disconnected");
    };

    // handle error
    const handleError = () => {
      console.log("error");
      toast.error("Socket error");
    };

    // handle connected
    const handleConnected = () => {
      toast.success("connected");
    };

    // handle receiveMessage
    const handleReceiveMessage = (data: any) => {
      setMessages((prev) => [...prev, data]);
      setMsgLoading(false);
    };

    // handle reloadChat
    const handleReloadChat = () => {
      fetchMessages();
    };

    // handle incomingCall
    const handleIncomingCall = ({ fromUserId, room }: any) => {
      console.log("incomingCall");
      setIncomingCall({ fromUserId, room });
    };

    // handle inCall
    const handleInCall = ({ toUserId, room }: any) => {
      console.log("inCall");
      setInCall(true);
      toast.success("Call Accepted");
    };

    // handle endCall
    const handleEndCallSocket = ({ toUserId, room }: any) => {
      console.log("endCall");
      setInCall(false);
      setRoomName(null);
      setIncomingCall(null);
      localStorage.removeItem("roomName");
      toast.success("Call ended");
    };

    // handle declined
    const handleDeclined = ({ toUserId, room }: any) => {
      console.log("declined");
      setRoomName(null);
      setIsCallStart(false);
      setIncomingCall(null);
      localStorage.removeItem("roomName");
      toast.success("Call declined");
    };

    // socket handlers
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("error", handleError);
    socket.on("Connected", handleConnected);
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("reloadChat", handleReloadChat);
    socket.on("incomingCall", handleIncomingCall);
    socket.on("inCall", handleInCall);
    socket.on("endCall", handleEndCallSocket);
    socket.on("declined", handleDeclined);

    // socket connection
    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    // when user in particular chat
    socket.emit("openChat", { chatId, userId: userDetails._id });

    // cleanup
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("error", handleError);
      socket.off("Connected", handleConnected);
      socket.emit("closeChat", { chatId, userId: userDetails._id });
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("reloadChat", handleReloadChat);
      socket.off("incomingCall", handleIncomingCall);
      socket.off("inCall", handleInCall);
      socket.off("endCall", handleEndCallSocket);
      socket.off("declined", handleDeclined);
    };
  }, [chatId, userDetails]);

  // Auto-scroll to the latest message
  useEffect(() => {
    divRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // handle token
  useEffect(() => {
    if (!chatId || !userDetails) return;

    const fetchToken = async () => {
      try {
        const res = await fetch("/api/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ room: chatId, userId: userDetails?._id }),
        });
        const data = await res.json();
        setToken(data.token);
      } catch (error) {
        console.log("error: ", error);
      }
    };

    fetchToken();
  }, [chatId, userDetails]);

  // on hard refresh
  useEffect(() => {
    // Check for hard reload or first load
    const navEntries = window.performance.getEntriesByType(
      "navigation"
    ) as PerformanceNavigationTiming[];
    const isHardRefresh =
      navEntries.length > 0 && navEntries[0].type === "reload";

    if (isHardRefresh) {
      if (window.innerWidth < 640) {
        dispatch(setOpenChatMobile(true));
      }
    }
  }, [dispatch]);

  return (
    <motion.div
      className="flex flex-col items-start rounded-xl max-w-full relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Top Bar */}
      <div className="h-16 px-1 py-2 flex items-center justify-between bg-slate-50 w-full sm:rounded-tr-xl">
        {/* left */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              dispatch(setOpenChatMobile(false));
              router.push("/chat");
            }}
            className="px-2 py-2 block sm:hidden"
          >
            <IoArrowBackSharp className="text-2xl text-slate-500" />
          </button>

          <div className="flex items-start gap-2 lg:gap-4">
            <Image
              className="rounded-full min-w-8 min-h-8 max-h-8 max-w-8"
              alt="dp"
              src={otherUser?.image || fallbackImage}
              width={40}
              height={40}
              priority
            />
            <div className="text-base font-medium text-black">
              {otherUser?.username}
            </div>
          </div>
        </div>

        {/* icon */}
        <div className="flex items-center gap-6 mr-4">
          <button className="cursor-pointer">
            <IoCallOutline className="text-2xl text-slate-950" />
          </button>

          {!inCall ? (
            <button onClick={handleVideoCall} className="cursor-pointer">
              <IoVideocamOutline className="text-3xl text-slate-900" />
            </button>
          ) : (
            <button className="cursor-pointer">
              <IoVideocamOutline className="text-3xl text-slate-900 opacity-20" />
            </button>
          )}
        </div>
      </div>

      {/* Message Box */}
      <div className="w-full relative">
        {loading ? (
          <div
            className="max-h-[calc(100dvh-115px)] min-h-[calc(100dvh-115px)] sm:max-h-[calc(100dvh-180px)] sm:min-h-[calc(100dvh-180px)] p-4 overflow-auto bg-gray-800 bg-center bg-cover"
            style={{ backgroundImage: `url(${wspLogo.src})` }}
          >
            <div className="flex justify-center items-center py-6">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-black border-t-transparent"></div>
            </div>
          </div>
        ) : (
          <div
            className="max-h-[calc(100dvh-120px)] min-h-[calc(100dvh-120px)] sm:max-h-[calc(100dvh-180px)] sm:min-h-[calc(100dvh-180px)] p-4 overflow-y-auto bg-gray-800"
            style={{ backgroundImage: `url(${wspLogo.src})` }}
          >
            {messages.length === 0 ? (
              <div className="flex items-center justify-center">
                No message found. Let's chat
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((msg) => (
                  <div key={msg._id} className="flex flex-col gap-1">
                    {/* Receiver */}
                    <Receiver
                      msg={msg}
                      userDetails={userDetails}
                      socketRef={socketRef}
                      setAcceptLoading={setAcceptLoading}
                      acceptLoading={acceptLoading}
                    />

                    {/* Sender */}
                    <Sender
                      msg={msg}
                      userDetails={userDetails}
                      socketRef={socketRef}
                      setModalData={setModalData}
                      session={session}
                      seenMessage={seenMessage}
                    />
                  </div>
                ))}
              </div>
            )}
            <div ref={divRef}></div>
          </div>
        )}
      </div>

      {/* Send Message */}
      <div className="w-full bg-gray-300 px-4 py-2 flex items-center gap-2 rounded-br-xl relative">
        <input
          type="text"
          defaultValue=""
          onChange={(e) => (chatRef.current = e.target.value)}
          placeholder="Type a message and press enter"
          onKeyDown={handleKeyDown}
          className="bg-white w-full h-10 sm:h-10 px-4 rounded-full outline-none shadow-2xl"
        />

        <button
          onClick={sendMessage}
          disabled={msgLoading}
          className={`${
            msgLoading ? "opacity-50" : "opacity-100"
          } bg-green-700 text-white px-3 py-2 rounded-lg text-base sm:text-lg cursor-pointer absolute right-6 sm:right-6`}
        >
          <IoSendSharp />
        </button>
      </div>

      {/* accept/ decline */}
      <AnimatePresence mode="wait">
        {!inCall && incomingCall && (
          <motion.div
            className="flex items-center gap-3 bg-slate-200 z-50 px-4 py-3 rounded-md absolute top-12 shadow-xl left-[50%] right-[50%] -translate-x-[50%] w-fit"
            initial={{ y: -20 }}
            animate={{ y: 48 }}
            exit={{ y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <button
              onClick={handleAccept}
              className="cursor-pointer px-3 py-2 rounded-2xl bg-green-800 text-white text-xs font-semibold"
            >
              Accept
            </button>
            <button
              onClick={handleReject}
              className="cursor-pointer px-3 py-2 rounded-2xl bg-red-500 text-slate-900 text-xs font-semibold"
            >
              Decline
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Livekit */}
      {token && localStorage.getItem("roomName") && (
        <div
          style={{ width: "100%", height: "100%" }}
          className="absolute top-0 left-0 right-0 bottom-0"
        >
          <LiveKitRoom
            token={token}
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
            connect
            video
            audio
          >
            <GridContent />
            <div className="mt-2 absolute bottom-5 right-4 flex items-center gap-4">
              <CustomControlBar
                setToken={setToken}
                setRoomName={setRoomName}
                setIsCallAccepted={setInCall}
                setIsCallStart={setIsCallStart}
              />
              <button onClick={handleEndCall} className="bg-red-500 text-white rounded-full w-12 h-12 cursor-pointer flex items-center justify-center"><MdCallEnd className="text-2xl" /></button>
            </div>
          </LiveKitRoom>
        </div>
      )}

      {/* sendMoneyModal */}
      {modalData && (
        <SendMoneyModal
          modalData={modalData}
          setModalData={setModalData}
          setRefreshButton={setRefreshButton}
          socketRef={socketRef}
          chatId={chatId}
        />
      )}
    </motion.div>
  );
};

export default memo(Page);

// GridContent
const GridContent = () => {
  const tracks = useTracks();
  return (
    <div className="grid grid-cols-1 gap-0 bg-red-400 h-full">
      {tracks.map((trackRef: any, index: number) => (
        <ParticipantTile
          key={index}
          trackRef={trackRef}
          className="bg-gray-800"
        />
      ))}
    </div>
  );
};

// CustomControlBar
const CustomControlBar = ({
  setToken,
  setRoomName,
  setIsCallAccepted,
  setIsCallStart,
}: any) => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  const toggleMic = async () => {
    const isMicEnabled = localParticipant.isMicrophoneEnabled;
    await localParticipant.setMicrophoneEnabled(!isMicEnabled);
  };

  const toggleCamera = async () => {
    const isCamEnabled = localParticipant.isCameraEnabled;
    await localParticipant.setCameraEnabled(!isCamEnabled);
  };

  return (
    <div className="bg-slate-700 w-fit px-4 py-3 rounded-lg flex items-center gap-6">
      <button onClick={toggleMic} className="text-white cursor-pointer">
        {localParticipant.isMicrophoneEnabled ? (
          <MdKeyboardVoice className="text-2xl" />
        ) : (
          <MdMicOff className="text-2xl" />
        )}
      </button>
      <button onClick={toggleCamera} className="text-white cursor-pointer">
        {localParticipant.isCameraEnabled ? (
          <LuCamera className="text-2xl" />
        ) : (
          <LuCameraOff className="text-2xl" />
        )}
      </button>
      <button
        onClick={() => {
          room.disconnect();

          // Remove token and room name from parent state
          setRoomName("");
          setIsCallAccepted(false);
          setIsCallStart(false);
        }}
        className="text-red-500 cursor-pointer"
      >
        <IoMdExit className="text-2xl" />
      </button>
    </div>
  );
};
