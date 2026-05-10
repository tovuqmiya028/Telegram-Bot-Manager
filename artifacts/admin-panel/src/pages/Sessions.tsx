import { useGetSessions, useDisconnectSession } from "@workspace/api-client-react";
import { getGetSessionsQueryKey } from "@workspace/api-client-react/generated/api";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Unplug, Smartphone } from "lucide-react";

export default function Sessions() {
  const { data: sessions, isLoading } = useGetSessions();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const disconnectMutation = useDisconnectSession();

  const handleDisconnect = async (id: number, phone: string) => {
    if (!confirm(`Are you sure you want to forcibly disconnect session for ${phone}?`)) return;
    
    try {
      await disconnectMutation.mutateAsync({ id });
      toast({ title: "Session Disconnected", description: `Connection terminated for ${phone}.` });
      queryClient.invalidateQueries({ queryKey: getGetSessionsQueryKey() });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Action failed", description: err.message });
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded bg-primary/20 text-primary flex items-center justify-center">
          <Smartphone size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Active Links</h1>
          <p className="text-muted-foreground mt-1">Live Telegram sessions established across the network.</p>
        </div>
      </div>

      <div className="rounded-md border border-border/50 bg-card/50">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="font-mono text-xs uppercase tracking-wider">Phone / User</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">Status</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">Established</TableHead>
              <TableHead className="text-right font-mono text-xs uppercase tracking-wider">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-border/50">
                  <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : sessions?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  No active sessions found.
                </TableCell>
              </TableRow>
            ) : (
              sessions?.map((session) => (
                <TableRow key={session.id} className="border-border/50 transition-colors hover:bg-muted/50">
                  <TableCell>
                    <div className="font-mono font-medium text-foreground">{session.phone}</div>
                    <div className="text-xs text-muted-foreground">{session.userFullName || "Unknown Node"}</div>
                  </TableCell>
                  <TableCell>
                    {session.isActive ? (
                      <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border-emerald-500/20 font-mono text-[10px]">CONNECTED</Badge>
                    ) : (
                      <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground border-border/50">OFFLINE</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {format(new Date(session.createdAt), "MMM d, yyyy HH:mm:ss")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors font-mono text-xs uppercase tracking-wider"
                      onClick={() => handleDisconnect(session.id, session.phone)}
                      disabled={!session.isActive}
                    >
                      <Unplug className="mr-2 h-3 w-3" />
                      Terminate
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
