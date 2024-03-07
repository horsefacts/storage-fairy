import { Button, Frog, TextInput } from "frog";
import { handle } from "frog/vercel";
import { storageRegistry } from "../lib/contracts.js";
import neynar from "../lib/neynar.js";
import { User as UserV1 } from "@neynar/nodejs-sdk/build/neynar-api/v1/openapi/models/user.js";
import { User as UserV2 } from "@neynar/nodejs-sdk/build/neynar-api/v2/openapi-farcaster/models/user.js";

type State = {
  user: UserV1 | null;
  giver: UserV2 | null;
  txHash: string | null;
  indexed: boolean;
};

export const app = new Frog<State>({
  basePath: "/api/frame",
  secret: process.env.FROG_SECRET,
  browserLocation: "https://warpcast.notion.site/The-Storage-Fairy-53cfd5d20596482883c2a76f5ce97328",
  dev: { enabled: true},
  initialState: {
    user: null,
    giver: null,
    txHash: null,
    indexed: false,
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
    image: 'https://storage-fairy.vercel.app/storage-fairy.png',
    intents: [
      <TextInput placeholder="Enter a username" />,
      <Button value="find" action="/find">
        🔍 Find user
      </Button>,
      <Button.Link href="https://warpcast.notion.site/The-Storage-Fairy-53cfd5d20596482883c2a76f5ce97328">More info</Button.Link>,
    ],
  });
});

app.frame("/find", async (c) => {
  const {
    frameData,
    buttonValue,
    inputText,
    previousState,
    deriveState,
    transactionId,
  } = c;

  let found = false;
  let user: UserV1;
  let giver: UserV2;
  if (buttonValue === "find" && !transactionId) {
    const username = (inputText ?? "").trim().replace(/^@/, "");
    try {
      const { result } = await neynar.lookupUserByUsername(username, 3);
      user = result.user;
      found = true;
    } catch (error) {}
    try {
      const { users } = await neynar.fetchBulkUsers([frameData?.fid ?? 1], {
        viewerFid: 3,
      });
      giver = users[0];
    } catch (error) {}
  }

  let indexed = false;
  if (previousState.txHash && !previousState.indexed) {
    const txData = await fetch(
      `https://api.onceupon.gg/v1/transactions/${previousState.txHash}`
    );
    if (txData.status === 200) {
      indexed = true;
      if (previousState.user && previousState.giver) {
        const cast = `@${previousState.user?.username}, @${previousState.giver?.username} gave you 1 storage unit.`;
        await neynar.publishCast(process.env.NEYNAR_SIGNER_UUID ?? "", cast, {
          embeds: [{ url: `https://www.onceupon.gg/${previousState.txHash}` }],
        });
      }
    }
  }

  const state = deriveState((previousState) => {
    if (user) {
      previousState.user = user;
    }
    if (giver) {
      previousState.giver = giver;
    }
    if (transactionId) {
      previousState.txHash = transactionId;
    }
    if (indexed) {
      previousState.indexed = true;
    }
  });

  const getIntents = (state: State) => {
    if (state.txHash) {
      return [
        <Button value="refresh">🔄 Refresh</Button>,
        <Button.Link href={`https://www.onceupon.gg/${state.txHash}`}>
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
    if (state.txHash) {
      if (state.indexed) {
        return `https://og.onceupon.gg/card/${state.txHash}`;
      } else {
        return (
          <div
            style={{
              alignItems: "center",
              background: "white",
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
                color: "black",
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
                <div style={{ fontSize: 60, color: "rgb(67, 44, 141)" }}>
                  Broadcasting...
                </div>
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
      : "https://storage-fairy.vercel.app/default-avatar.png";

    return (
      <div
        style={{
          alignItems: "center",
          background: "white",
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
            color: "black",
            fontSize: 60,
            fontStyle: "normal",
            letterSpacing: "-0.025em",
            lineHeight: 1.4,
            marginTop: 30,
            padding: "0 120px",
            whiteSpace: "pre-wrap",
          }}
        >
          {found ? (
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
                  style={{
                    width: 200,
                    height: 200,
                    borderRadius: 100,
                    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.5)",
                  }}
                />
                <div style={{ color: "rgb(67, 44, 141)" }}>
                  {state.user?.displayName}
                </div>
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
