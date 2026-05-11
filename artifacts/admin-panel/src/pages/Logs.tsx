import { useState } from "react";
import { useGetLogs, useClearLogs, getGetLogsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Search, RefreshCw, ListOrdered, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Logs() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "fail">("all");
  const { data: logs, isLoading, refetch } = useGetLogs();
  const clearLogsMutation = useClearLogs();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleClearLogs = async () => {
    if (!confirm("Barcha loglarni o'chirib tashlamoqchimisiz? Bu amalni qaytarib bo'lmaydi.")) return;
    try {
      const result = await clearLogsMutation.mutateAsync();
      toast({ title: `${result.deleted} ta log o'chirildi` });
      queryClient.invalidateQueries({ queryKey: getGetLogsQueryKey() });
    } catch {
      toast({ variant: "destructive", title: "Xatolik yuz berdi" });
    }
  };

  const filtered = (logs ?? []).filter((log) => {
    const matchStatus = statusFilter === "all" || log.status.toLowerCase() === statusFilter;
    const matchSearch =
      !search ||
      log.messageText?.toLowerCase().includes(search.toLowerCase()) ||
      String(log.contactId).includes(search);
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Message Logs</h1>
          <p className="text-muted-foreground mt-1">Delivery history for all scheduled sends.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" /> Yangilash
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={handleClearLogs}
            disabled={clearLogsMutation.isPending || !logs?.length}
          >
            <Trash2 className="h-4 w-4" /> Loglarni tozalash
          </Button>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by message or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {(["all", "success", "fail"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="capitalize"
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ListOrdered className="h-4 w-4" />
            {filtered.length} entries
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-0 divide-y divide-border/40">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-6 py-4">
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="divide-y divide-border/40">
              {filtered.map((log) => (
                <div
                  key={log.id}
                  className="px-6 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="shrink-0">
                    {log.status.toLowerCase() === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-1 text-foreground">{log.messageText ?? "—"}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      Session #{log.sessionId} → Contact #{log.contactId}
                      {log.taskId ? ` · Task #${log.taskId}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge
                      variant={log.status.toLowerCase() === "success" ? "default" : "destructive"}
                      className="text-[10px] h-5 mb-1"
                    >
                      {log.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground font-mono">
                      {log.sentAt ? format(new Date(log.sentAt), "MMM d, HH:mm:ss") : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <ListOrdered className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">No logs found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
