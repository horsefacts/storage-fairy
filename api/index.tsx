import { Button, Frog, TextInput } from "frog";
import { handle } from "frog/vercel";
import { storageRegistry } from "../lib/contracts.js";
import neynar from "../lib/neynar.js";
import { User } from "@neynar/nodejs-sdk/build/neynar-api/v1/openapi/models/user.js";

type State = {
  user: User | null;
  txHash: string | null;
  indexed: boolean;
};

export const app = new Frog<{ State: State }>({
  basePath: "/api/frame",
  initialState: {
    user: null,
    txHash: null,
    indexed: false
  },
});

app.transaction("/rent", async (c) => {
  const { previousState } = c;

  // Get user from state
  const { user } = previousState as State;
  const fid = user?.fid ?? 0;

  // Get current storage price
  const units = 1n;
  const price = await storageRegistry.read.price([units]);

  // Construct transaction
  return c.contract({
    abi: storageRegistry.abi,
    chainId: "eip155:10",
    functionName: "rent",
    args: [BigInt(fid), units],
    to: storageRegistry.address,
    value: price,
  });
});

app.frame("/", async (c) => {
  return c.res({
    image: (
      <div
        style={{
          alignItems: "center",
          background: "black",
          backgroundSize: "100% 100%",
          display: "flex",
          flexDirection: "column",
          flexWrap: "nowrap",
          height: "100%",
          justifyContent: "center",
          textAlign: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "white",
            fontStyle: "normal",
            letterSpacing: "-0.025em",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: 80 }}>🎁 Give storage to a friend!</div>
            <div
              style={{ fontSize: 40, display: "flex", flexDirection: "column" }}
            >
              <div>
                Enter a username below to give 1 storage unit to a friend.
              </div>
              <div>You'll need about $5 of ETH on Optimism.</div>
            </div>
          </div>
        </div>
      </div>
    ),
    intents: [
      <TextInput placeholder="Enter a username" />,
      <Button value="find" action="/find">
        🔍 Find user
      </Button>,
    ],
  });
});

app.frame("/find", async (c) => {
  const { buttonValue, inputText, deriveState, transactionId } = c;

  const state = await deriveState(async (previousState) => {
    if (buttonValue === "find" && !transactionId) {
      const username = (inputText ?? "").trim().replace(/^@/, "");
      try {
        const { result } = await neynar.lookupUserByUsername(username, 3);
        previousState.user = result.user;
      } catch (error) { }
    }
    if (transactionId && !previousState.indexed) {
      const txData = await fetch(
        `https://api.onceupon.gg/v1/transactions/${transactionId}`
      );
      if (txData.status === 200) {
        previousState.indexed = true;
      }
    }
  });

  const getIntents = (state: State) => {
    if (transactionId) {
      return [
        <Button value="refresh">🔄 Refresh</Button>,
        <Button.Link href={`https://www.onceupon.gg/${transactionId}`}>
          View Transaction
        </Button.Link>,
      ];
    } else if (state.user) {
      return [
        <Button.Reset>⬅️ Back</Button.Reset>,
        <Button.Transaction target="/rent">🎁 Give</Button.Transaction>,
      ];
    } else {
      return [
        <TextInput placeholder="Enter a username" />,
        <Button value="find" action="/find">
          🔍 Try again
        </Button>,
      ];
    }
  };

  const getImage = async (state: State) => {
    if (transactionId) {
      if (state.indexed) {
        return `https://og.onceupon.gg/card/${transactionId}`;
      } else {
        return (
          <div
            style={{
              alignItems: "center",
              background: "black",
              backgroundSize: "100% 100%",
              display: "flex",
              flexDirection: "column",
              flexWrap: "nowrap",
              height: "100%",
              justifyContent: "center",
              textAlign: "center",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                color: "white",
                fontSize: 60,
                fontStyle: "normal",
                letterSpacing: "-0.025em",
                lineHeight: 1.4,
                marginTop: 30,
                padding: "0 120px",
                whiteSpace: "pre-wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div style={{ fontSize: 60 }}>Broadcasting...</div>
                <div
                  style={{
                    fontSize: 40,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div>Click "Refresh" below to check on your transaction.</div>
                </div>
              </div>
            </div>
          </div>
        );
      }
    }

    const pfp = state.user?.pfp.url
      ? `https://res.cloudinary.com/merkle-manufactory/image/fetch/c_fill,f_jpg,w_144/${encodeURIComponent(
        state.user.pfp.url
      )}`
      : "/default-avatar.png";

    return (
      <div
        style={{
          alignItems: "center",
          background: "black",
          backgroundSize: "100% 100%",
          display: "flex",
          flexDirection: "column",
          flexWrap: "nowrap",
          height: "100%",
          justifyContent: "center",
          textAlign: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "white",
            fontSize: 60,
            fontStyle: "normal",
            letterSpacing: "-0.025em",
            lineHeight: 1.4,
            marginTop: 30,
            padding: "0 120px",
            whiteSpace: "pre-wrap",
          }}
        >
          {state.user ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 50,
                }}
              >
                <img
                  src={pfp}
                  style={{ width: 200, height: 200, borderRadius: 100 }}
                />
                <div>{state.user?.displayName}</div>
              </div>
              <p style={{ marginTop: 0 }}>
                Give storage to @{state.user?.username}?
              </p>
            </div>
          ) : (
            <p>👀 User not found.</p>
          )}
        </div>
      </div>
    );
  };

  return c.res({
    image: await getImage(state),
    intents: getIntents(state),
  });
});

export const GET = handle(app);
export const POST = handle(app);
