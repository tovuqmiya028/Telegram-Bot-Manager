import { useState } from "react";
import {
  useGetTasks,
  useDeleteTask,
  usePauseTask,
  useResumeTask,
  useGetSessions,
  useCreateTask,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Clock, Play, Pause, Trash2, RefreshCw, Plus, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Tasks() {
  const { data: tasks, isLoading, refetch } = useGetTasks();
  const { data: sessions } = useGetSessions();
  const { mutateAsync: deleteTask } = useDeleteTask();
  const { mutateAsync: pauseTask } = usePauseTask();
  const { mutateAsync: resumeTask } = useResumeTask();
  const createTaskMutation = useCreateTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    sessionId: "",
    messageText: "",
    scheduleType: "daily",
    scheduleTime: "09:00",
    scheduleDate: "",
  });

  const activeSessions = sessions?.filter(s => s.isActive) ?? [];

  const handleDelete = async (id: number) => {
    if (!confirm("Bu vazifani o'chirib tashlamoqchimisiz?")) return;
    try {
      await deleteTask({ id });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Vazifa o'chirildi" });
    } catch {
      toast({ title: "O'chirishda xatolik", variant: "destructive" });
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
      toast({ title: "Yangilashda xatolik", variant: "destructive" });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sessionId) { toast({ title: "Sessiyani tanlang", variant: "destructive" }); return; }
    try {
      await createTaskMutation.mutateAsync({
        data: {
          sessionId: Number(form.sessionId),
          messageText: form.messageText,
          scheduleType: form.scheduleType,
          scheduleTime: form.scheduleTime,
          scheduleDate: form.scheduleType === "once" && form.scheduleDate ? form.scheduleDate : undefined,
        },
      });
      toast({ title: "Vazifa yaratildi!" });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowCreate(false);
      setForm({ sessionId: "", messageText: "", scheduleType: "daily", scheduleTime: "09:00", scheduleDate: "" });
    } catch {
      toast({ title: "Yaratishda xatolik", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rejalashtirilgan vazifalar</h1>
          <p className="text-muted-foreground mt-1">Avtomatik xabar yuborish vazifalarini boshqaring.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" /> Yangilash
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Yangi vazifa
          </Button>
        </div>
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
                        {task.isActive ? "Faol" : "To'xtatilgan"}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {task.scheduleType} @ {task.scheduleTime}
                        {task.scheduleDate ? ` (${task.scheduleDate})` : ""}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Yuborildi: <span className="font-mono font-medium">{task.sentCount ?? 0}</span>
                      </span>
                    </div>
                    <p className="text-sm line-clamp-2 text-foreground">{task.messageText}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      {task.userFullName ?? `Session #${task.sessionId}`} → {task.contactName ?? `Contact #${task.contactId ?? "—"}`}
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
            <p className="text-muted-foreground">Hozircha rejalashtirilgan vazifalar yo'q.</p>
            <Button size="sm" className="gap-2 mt-1" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> Yangi vazifa yaratish
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi vazifa yaratish</DialogTitle>
            <DialogDescription>Avtomatik xabar yuborish jadvalini sozlang.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Sessiya</Label>
              <Select value={form.sessionId} onValueChange={(v) => setForm(f => ({ ...f, sessionId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Faol sessiyani tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {activeSessions.length === 0 ? (
                    <SelectItem value="_none" disabled>Faol sessiyalar yo'q</SelectItem>
                  ) : activeSessions.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.userFullName ?? s.phone} ({s.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Xabar matni</Label>
              <Textarea
                required
                rows={3}
                placeholder="Yuborilacak xabar..."
                value={form.messageText}
                onChange={e => setForm(f => ({ ...f, messageText: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Jadval turi</Label>
                <Select value={form.scheduleType} onValueChange={(v) => setForm(f => ({ ...f, scheduleType: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Har kuni</SelectItem>
                    <SelectItem value="weekly">Har hafta</SelectItem>
                    <SelectItem value="once">Bir marta</SelectItem>
                    <SelectItem value="interval">Interval</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Vaqt (HH:MM)</Label>
                <Input
                  required
                  type="time"
                  value={form.scheduleTime}
                  onChange={e => setForm(f => ({ ...f, scheduleTime: e.target.value }))}
                />
              </div>
            </div>

            {form.scheduleType === "once" && (
              <div className="space-y-1.5">
                <Label>Sana</Label>
                <Input
                  type="date"
                  value={form.scheduleDate}
                  onChange={e => setForm(f => ({ ...f, scheduleDate: e.target.value }))}
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>
                Bekor qilish
              </Button>
              <Button type="submit" className="flex-1" disabled={createTaskMutation.isPending}>
                {createTaskMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Yaratish
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
