import { useState } from "react";
import {
  useGetTasks,
  useDeleteTask,
  usePauseTask,
  useResumeTask,
  useGetSessions,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Play, Pause, Trash2, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export default function Tasks() {
  const { data: tasks, isLoading, refetch } = useGetTasks();
  const { mutateAsync: deleteTask } = useDeleteTask();
  const { mutateAsync: pauseTask } = usePauseTask();
  const { mutateAsync: resumeTask } = useResumeTask();
  const queryClient = useQueryClient();

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this task?")) return;
    try {
      await deleteTask({ id });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task deleted" });
    } catch {
      toast({ title: "Failed to delete task", variant: "destructive" });
    }
  };

  const handleToggle = async (id: number, isActive: boolean) => {
    try {
      if (isActive) {
        await pauseTask({ id });
      } else {
        await resumeTask({ id });
      }
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch {
      toast({ title: "Failed to update task", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scheduled Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage automated message delivery tasks.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : tasks && tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant={task.isActive ? "default" : "secondary"}>
                        {task.isActive ? "Active" : "Paused"}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {task.scheduleType} @ {task.scheduleTime}
                        {task.scheduleDate ? ` (${task.scheduleDate})` : ""}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Sent: <span className="font-mono font-medium">{task.sentCount ?? 0}</span>
                      </span>
                    </div>
                    <p className="text-sm line-clamp-2 text-foreground">{task.messageText}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      {task.userFullName ?? `Session #${task.sessionId}`} → {task.contactName ?? `Contact #${task.contactId}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggle(task.id, task.isActive ?? false)}
                    >
                      {task.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Clock className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No scheduled tasks yet.</p>
            <p className="text-sm text-muted-foreground">Tasks are created via the Telegram bot.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
