import { useState } from "react";
import { useSendBroadcast, useGetSessions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Radio, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Broadcast() {
  const { data: sessions } = useGetSessions();
  const { mutateAsync: sendBroadcast, isPending } = useSendBroadcast();

  const [message, setMessage] = useState("");
  const [sessionId, setSessionId] = useState<string>("all");
  const [onlyActive, setOnlyActive] = useState(true);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  const activeSessions = sessions?.filter((s) => s.isActive) ?? [];
  const allSessions = sessions ?? [];

  const handleBroadcast = async () => {
    if (!message.trim()) {
      toast({ title: "Please enter a message", variant: "destructive" });
      return;
    }
    try {
      const res = await sendBroadcast({
        data: {
          message,
          sessionId: sessionId !== "all" ? Number(sessionId) : undefined,
          onlyActive,
        },
      });
      setResult({ sent: res.sent ?? 0, failed: res.failed ?? 0 });
      toast({
        title: `Broadcast complete: ${res.sent ?? 0} sent, ${res.failed ?? 0} failed`,
      });
    } catch {
      toast({ title: "Broadcast failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Broadcast</h1>
        <p className="text-muted-foreground mt-1">
          Send a message to all contacts across active sessions.
        </p>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="h-4 w-4 text-orange-500" />
            Broadcast Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              placeholder="Type your broadcast message here..."
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="resize-none font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground text-right">{message.length} characters</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Session</Label>
              <Select value={sessionId} onValueChange={setSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="All sessions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sessions</SelectItem>
                  {allSessions.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.phone} {s.isActive ? "✓" : "(inactive)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Filters</Label>
              <div className="flex items-center gap-3 h-10">
                <Switch
                  id="only-active"
                  checked={onlyActive}
                  onCheckedChange={setOnlyActive}
                />
                <Label htmlFor="only-active" className="font-normal cursor-pointer">
                  Active sessions only
                </Label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              className="gap-2"
              disabled={isPending || !message.trim()}
              onClick={handleBroadcast}
            >
              <Send className="h-4 w-4" />
              {isPending ? "Sending..." : "Send Broadcast"}
            </Button>
            {activeSessions.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {activeSessions.length} active session{activeSessions.length !== 1 ? "s" : ""} available
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Last Broadcast Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                <div>
                  <p className="text-2xl font-bold font-mono">{result.sent}</p>
                  <p className="text-xs text-muted-foreground">Messages sent</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <div>
                  <p className="text-2xl font-bold font-mono">{result.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
