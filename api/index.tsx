import { Button, Frog, TextInput } from "frog";
import { handle } from "frog/vercel";
import { storageRegistry } from "../lib/contracts.js";
import neynar from "../lib/neynar.js";

// Uncomment to use Edge Runtime.
// export const config = {
//   runtime: 'edge',
// }

type State = {
  fid: number;
  username: string;
  displayName: string;
  pfp: string;
};

export const app = new Frog<State>({
  basePath: "/",
  initialState: {
    fid: 0,
    username: "",
    displayName: "",
    pfp: "",
  },
});

app.transaction("/rent", async (c) => {
  const { previousState } = c;

  // Get fid from state
  const { fid } = (previousState as State);

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
              <div>You'll need about $3 of ETH on Optimism.</div>
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
  const { buttonValue, inputText, deriveState } = c;

  let found = false;
  let fid = 0;
  let username: string;
  let displayName: string;
  let pfp: string;
  if (buttonValue === "find") {
    username = (inputText ?? "").replace(/^@/, "");
    try {
      const { result } = await neynar.lookupUserByUsername(username, 3);
      fid = result.user.fid;
      displayName = result.user.displayName;
      pfp = result.user.pfp.url;
      found = true;
    } catch (error) {}
  }

  const state = deriveState((previousState) => {
    if (fid) {
      previousState.fid = fid;
    }
    if (username) {
      previousState.username = username;
    }
    if (displayName) {
      previousState.displayName = displayName;
    }
    if (pfp) {
      previousState.pfp = pfp;
    }
  });

  const intents =
    fid > 0
      ? [
          <Button.Reset>⬅️ Back</Button.Reset>,
          <Button.Transaction target="/rent">
            🎁 Give Storage
          </Button.Transaction>,
        ]
      : [
          <TextInput placeholder="Enter a username" />,
          <Button value="find" action="/find">
            🔍 Try again
          </Button>,
        ];

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
                  src={state.pfp}
                  style={{ width: 200, height: 200, borderRadius: 100 }}
                />
                <div>{state.displayName}</div>
              </div>
              <p>Give storage to @{state.username}?</p>
            </div>
          ) : (
            <p>Username not found.</p>
          )}
        </div>
      </div>
    ),
    intents,
  });
});

export const GET = handle(app);
export const POST = handle(app);
