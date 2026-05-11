import {
  useGetDashboardStats,
  useGetDashboardRecentLogs,
  useClearLogs,
  getGetDashboardRecentLogsQueryKey,
  getGetDashboardStatsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Smartphone, Clock, ListOrdered, CheckCircle2, XCircle, ShieldAlert, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: logs, isLoading: logsLoading } = useGetDashboardRecentLogs();
  const clearLogsMutation = useClearLogs();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleClearLogs = async () => {
    if (!confirm("Barcha loglarni o'chirib tashlamoqchimisiz?")) return;
    try {
      const result = await clearLogsMutation.mutateAsync();
      toast({ title: `${result.deleted} ta log o'chirildi` });
      queryClient.invalidateQueries({ queryKey: getGetDashboardRecentLogsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    } catch {
      toast({ variant: "destructive", title: "Xatolik yuz berdi" });
    }
  };

  const statCards = [
    { title: "Total Users", value: stats?.totalUsers, icon: Users, color: "text-blue-500" },
    { title: "Active Sessions", value: stats?.activeSessions, icon: Smartphone, color: "text-green-500" },
    { title: "Active Tasks", value: stats?.totalTasks, icon: Clock, color: "text-orange-500" },
    { title: "Total Logs", value: stats?.totalLogs, icon: ListOrdered, color: "text-purple-500" },
    { title: "Blocked Users", value: stats?.blockedUsers, icon: ShieldAlert, color: "text-red-500" },
    { title: "Successful Sends", value: stats?.successfulLogs, icon: CheckCircle2, color: "text-emerald-500" },
    { title: "Failed Sends", value: stats?.failedLogs, icon: XCircle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
        <p className="text-muted-foreground mt-2">Real-time status of all controlled Telegram nodes.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold font-mono">{stat.value?.toLocaleString() ?? 0}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>So'nggi faoliyat</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-destructive"
            onClick={handleClearLogs}
            disabled={clearLogsMutation.isPending || !logs?.length}
          >
            <Trash2 className="h-4 w-4" />
            Tozalash
          </Button>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={log.status?.toLowerCase() === "success" ? "default" : "destructive"} className="text-[10px] h-5">
                        {log.status}
                      </Badge>
                      <span className="font-semibold text-sm">{log.userFullName ?? "—"}</span>
                      <span className="text-muted-foreground text-xs">→</span>
                      <span className="font-medium text-sm">{log.contactName ?? "—"}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{log.messageText ?? "—"}</p>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono shrink-0 ml-4">
                    {format(new Date(log.sentAt), "dd.MM HH:mm")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Hech qanday faoliyat qayd etilmagan.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
