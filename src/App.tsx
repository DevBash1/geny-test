import React, { useEffect, useRef, useState } from "react";
import { DeviceRendererFactory } from "@genymotion/device-web-player";
import {
    Activity,
    Play,
    Square,
    RefreshCw,
    Key,
    LogOut,
    CheckCircle,
    XCircle,
    Clock,
} from "lucide-react";
import { GenyAPI } from "./api";

function App() {
    const [apiKey, setApiKey] = useState<string>(
        () => localStorage.getItem("geny_api_key") || "",
    );
    const [activeInstanceId, setActiveInstanceId] = useState<string | null>(
        null,
    );

    const handleLogin = (key: string) => {
        localStorage.setItem("geny_api_key", key);
        setApiKey(key);
    };

    const handleLogout = () => {
        localStorage.removeItem("geny_api_key");
        setApiKey("");
        setActiveInstanceId(null);
    };

    if (!apiKey) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    if (activeInstanceId) {
        return (
            <PlayerScreen
                apiKey={apiKey}
                instanceId={activeInstanceId}
                onDisconnect={() => setActiveInstanceId(null)}
            />
        );
    }

    return (
        <DashboardScreen
            apiKey={apiKey}
            onConnect={(id) => setActiveInstanceId(id)}
            onLogout={handleLogout}
        />
    );
}

function LoginScreen({ onLogin }: { onLogin: (key: string) => void }) {
    const [keyInput, setKeyInput] = useState("");

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (keyInput.trim()) {
            onLogin(keyInput.trim());
        }
    };

    return (
        <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-950 p-8">
            <div className="flex items-center gap-3 mb-8">
                <Activity className="w-10 h-10 text-teal-400" />
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-teal-400 to-blue-500">
                    Genymotion Manager
                </h1>
            </div>

            <form
                onSubmit={submit}
                className="flex flex-col gap-5 w-full max-w-sm bg-gray-900 p-8 rounded-2xl shadow-xl shadow-black/50 border border-gray-800"
            >
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        SaaS API Token
                    </label>
                    <div className="relative">
                        <Key className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" />
                        <input
                            type="password"
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-white transition-all"
                            value={keyInput}
                            onChange={(e) => setKeyInput(e.target.value)}
                            placeholder="Enter your API token..."
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={!keyInput.trim()}
                    className="mt-2 px-6 py-2.5 bg-linear-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-semibold shadow-lg transition-transform active:scale-95"
                >
                    Authenticate
                </button>
            </form>
        </div>
    );
}

function DashboardScreen({
    apiKey,
    onConnect,
    onLogout,
}: {
    apiKey: string;
    onConnect: (id: string) => void;
    onLogout: () => void;
}) {
    const api = new GenyAPI(apiKey);

    const [instances, setInstances] = useState<any[]>([]);
    const [recipes, setRecipes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedRecipe, setSelectedRecipe] = useState("");
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [instRes, recRes] = await Promise.all([
                api.getInstances(),
                api.getRecipes(),
            ]);
            setInstances(instRes.results || []);
            setRecipes(recRes.results || []);

            if (
                recRes.results &&
                recRes.results.length > 0 &&
                !selectedRecipe
            ) {
                setSelectedRecipe(recRes.results[0].uuid);
            }
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Auto refresh every 10 seconds to catch state changes
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [apiKey]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRecipe || !newName) return;

        setCreating(true);
        try {
            await api.createInstance(selectedRecipe, newName);
            setNewName("");
            setTimeout(fetchData, 1000); // refresh after brief delay
        } catch (e) {
            console.error("Failed to create instance", e);
            alert("Failed to create instance. Check console.");
        } finally {
            setCreating(false);
        }
    };

    const handleStop = async (id: string) => {
        if (
            !confirm(
                "Are you sure you want to stop this disposable instance? All data will be lost.",
            )
        )
            return;
        try {
            await api.stopInstance(id);
            fetchData();
        } catch (e) {
            console.error("Failed to stop instance", e);
            alert("Failed to stop instance.");
        }
    };

    const StatusBadge = ({ state }: { state: string }) => {
        switch (state) {
            case "ONLINE":
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium border border-green-500/20">
                        <CheckCircle className="w-3.5 h-3.5" /> Online
                    </span>
                );
            case "CREATING":
            case "BOOTING":
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium border border-blue-500/20">
                        <Clock className="w-3.5 h-3.5 animate-pulse" /> Booting
                    </span>
                );
            case "STOPPED":
            case "DELETING":
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-500/10 text-gray-400 rounded-full text-xs font-medium border border-gray-500/20">
                        <XCircle className="w-3.5 h-3.5" /> Stopped
                    </span>
                );
            default:
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/10 text-yellow-400 rounded-full text-xs font-medium border border-yellow-500/20">
                        <Activity className="w-3.5 h-3.5" /> {state}
                    </span>
                );
        }
    };

    return (
        <div className="w-full min-h-screen bg-gray-950 p-6 md:p-12 text-white">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div className="flex items-center gap-3">
                        <Activity className="w-8 h-8 text-teal-400" />
                        <h1 className="text-3xl font-bold">Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchData}
                            className="p-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
                            title="Refresh"
                        >
                            <RefreshCw
                                className={`w-5 h-5 text-gray-300 ${loading ? "animate-spin" : ""}`}
                            />
                        </button>
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-red-900/40 hover:text-red-400 rounded-lg transition-colors border border-gray-700 hover:border-red-900/50"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Logout</span>
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Create Instance Panel */}
                    <div className="lg:col-span-1">
                        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-lg p-6">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <Play className="w-5 h-5 text-teal-400" />
                                Launch New Instance
                            </h2>
                            <form
                                onSubmit={handleCreate}
                                className="flex flex-col gap-4"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Recipe
                                    </label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-white appearance-none"
                                        value={selectedRecipe}
                                        onChange={(e) =>
                                            setSelectedRecipe(e.target.value)
                                        }
                                    >
                                        {recipes.map((r) => (
                                            <option key={r.uuid} value={r.uuid}>
                                                {r.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Instance Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-white"
                                        value={newName}
                                        onChange={(e) =>
                                            setNewName(e.target.value)
                                        }
                                        placeholder="e.g. testing-device-1"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={creating || !newName}
                                    className="mt-4 w-full flex justify-center items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-colors"
                                >
                                    {creating ? (
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Play className="w-4 h-4 fill-current" />
                                    )}
                                    Launch Device
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Instances List Panel */}
                    <div className="lg:col-span-2">
                        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-lg">
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                                <h2 className="text-xl font-semibold">
                                    Active Instances
                                </h2>
                                <span className="bg-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-full font-medium">
                                    {instances.length} items
                                </span>
                            </div>

                            <div className="divide-y divide-gray-800 max-h-[600px] overflow-y-auto">
                                {instances.length === 0 ? (
                                    <div className="p-12 text-center text-gray-500">
                                        <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p>No instances currently available.</p>
                                    </div>
                                ) : (
                                    instances.map((inst) => (
                                        <div
                                            key={inst.uuid}
                                            className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-800/50 transition-colors"
                                        >
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="font-medium text-lg text-gray-100">
                                                        {inst.name}
                                                    </h3>
                                                    <StatusBadge
                                                        state={inst.state}
                                                    />
                                                </div>
                                                <p className="text-sm text-gray-500 font-mono">
                                                    ID:{" "}
                                                    {inst.uuid.split("-")[0]}...
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {inst.state === "ONLINE" && (
                                                    <button
                                                        onClick={() =>
                                                            onConnect(inst.uuid)
                                                        }
                                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-600/50 hover:border-blue-500 rounded-lg text-sm font-medium transition-colors"
                                                    >
                                                        <Play className="w-4 h-4" />
                                                        Connect
                                                    </button>
                                                )}
                                                {[
                                                    "ONLINE",
                                                    "CREATING",
                                                    "BOOTING",
                                                ].includes(inst.state) && (
                                                    <button
                                                        onClick={() =>
                                                            handleStop(
                                                                inst.uuid,
                                                            )
                                                        }
                                                        className="flex items-center gap-2 px-4 py-2 bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/50 hover:border-red-500 rounded-lg text-sm font-medium transition-colors"
                                                    >
                                                        <Square className="w-4 h-4 fill-current" />
                                                        Stop
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PlayerScreen({
    apiKey,
    instanceId,
    onDisconnect,
}: {
    apiKey: string;
    instanceId: string;
    onDisconnect: () => void;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererAPI = useRef<any>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        const initPlayer = async () => {
            try {
                const api = new GenyAPI(apiKey);

                // Fetch webrtc address and token securely inside the frontend
                const instanceRes = await api.getInstance(instanceId);
                const webrtcAddress =
                    instanceRes.webrtc_url || instanceRes.webrtc_address;

                const token = await api.getInstanceToken(instanceId);

                if (!active) return;

                if (containerRef.current && !rendererAPI.current) {
                    const finalToken = token || apiKey;
                    console.log("Mounting player with token:", finalToken);
                    const deviceRendererFactory = new DeviceRendererFactory();
                    rendererAPI.current = deviceRendererFactory.setupRenderer(
                        containerRef.current,
                        webrtcAddress,
                        {
                            token: finalToken,
                            showPhoneBorder: true,
                            toolbarPosition: "right", // we need a position but we'll hide the icons
                            floatingToolbar: false,
                            toolbarOrder: [], // Empty array with no 'unordered' prevents any button from showing
                        },
                    );
                }
                setLoading(false);
            } catch (err: any) {
                if (active) {
                    console.error("Failed to init player", err);
                    setError(
                        err.message || "Failed to initialize player connection",
                    );
                    setLoading(false);
                }
            }
        };

        initPlayer();

        return () => {
            active = false;
            if (rendererAPI.current) {
                try {
                    if (typeof rendererAPI.current.disconnect === "function") {
                        rendererAPI.current.disconnect();
                    } else if (
                        rendererAPI.current.VM_communication &&
                        typeof rendererAPI.current.VM_communication
                            .disconnect === "function"
                    ) {
                        rendererAPI.current.VM_communication.disconnect();
                    }
                } catch (e) {
                    console.error("Error during player disconnection:", e);
                }
            }
        };
    }, [apiKey, instanceId]);

    return (
        <div className="w-full h-screen flex bg-black overflow-hidden relative">
            {/* Custom UI Side Panel */}
            <div className="w-80 border-r border-gray-800 bg-gray-950 flex flex-col p-6 z-10 shrink-0 shadow-2xl relative">
                <div className="flex items-center gap-3 mb-8">
                    <Activity className="w-8 h-8 text-teal-400" />
                    <h2 className="text-white font-bold text-xl drop-shadow-md">
                        Control Panel
                    </h2>
                </div>

                {/* Custom UI Area */}
                <div className="flex-1 rounded-xl border border-dashed border-gray-700 bg-gray-900/50 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-4 border border-gray-700">
                        <Play className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-gray-300 font-medium text-lg mb-2">
                        Build Your UI Here
                    </p>
                    <p className="text-gray-500 text-sm">
                        Create automation buttons, text input fields, and manage
                        custom app logic right alongside the active instance.
                    </p>
                </div>

                {/* Bottom Disconnect Button */}
                <div className="mt-6 pt-6 border-t border-gray-800">
                    <button
                        onClick={onDisconnect}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-900/20 text-red-500 hover:bg-red-900/40 hover:text-red-400 border border-red-900/50 hover:border-red-500 rounded-lg font-medium transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Disconnect Session
                    </button>
                </div>
            </div>

            {/* Genymotion Player Container */}
            <div className="flex-1 relative flex items-center justify-center bg-black">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 z-40 text-white">
                        <Activity className="w-12 h-12 text-teal-500 animate-pulse mb-6" />
                        <h2 className="text-xl font-medium animate-pulse">
                            Establishing secure connection...
                        </h2>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 z-40 text-white">
                        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-8 max-w-md text-center">
                            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold mb-2">
                                Connection Failed
                            </h2>
                            <p className="text-gray-400 mb-6">{error}</p>
                            <button
                                onClick={onDisconnect}
                                className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                )}

                {/* The actual Genymotion web player mounts inside this div */}
                {/* Scale the container dynamically using aspect-ratio instead of 100% width, allowing it to hug the phone content */}
                <div
                    ref={containerRef}
                    className="h-full aspect-[9/16] max-w-full"
                ></div>
            </div>
        </div>
    );
}

export default App;
