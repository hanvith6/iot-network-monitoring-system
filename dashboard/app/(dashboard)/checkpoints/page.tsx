"use client";

import { Activity, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CheckpointsPage() {
    const nodes = [
        { id: "NODE-01", location: "Main Gate", status: "Online", battery: "98%" },
        { id: "NODE-02", location: "Library Block", status: "Online", battery: "85%" },
        { id: "NODE-03", location: "Canteen", status: "Offline", battery: "12%" },
        { id: "NODE-04", location: "Hostel A", status: "Online", battery: "100%" },
    ];

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100">Checkpoints</h1>
                    <p className="text-slate-400">Manage and monitor sensor nodes across the campus.</p>
                </div>
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                    + Add New Node
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nodes.map((node) => (
                    <Card key={node.id} className="hover:border-slate-600 transition-all cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${node.status === 'Online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                    <Activity className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-lg">{node.id}</CardTitle>
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${node.status === 'Online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                {node.status}
                            </span>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 text-slate-400 mb-4">
                                <MapPin className="h-4 w-4" />
                                <span className="text-sm">{node.location}</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${parseInt(node.battery) > 20 ? 'bg-blue-500' : 'bg-rose-500'}`}
                                    style={{ width: node.battery }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 mt-2">
                                <span>Battery Level</span>
                                <span>{node.battery}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
