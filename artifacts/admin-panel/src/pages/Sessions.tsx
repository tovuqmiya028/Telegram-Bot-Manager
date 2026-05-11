import { useState } from "react";
import {
  useGetSessions,
  useDisconnectSession,
  useRequestSessionCode,
  useVerifySessionCode,
} from "@workspace/api-client-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Unplug, Smartphone, Plus, Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Step = "idle" | "phone" | "code";

export default function Sessions() {
  const { data: sessions, isLoading } = useGetSessions();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const disconnectMutation = useDisconnectSession();
  const requestCodeMutation = useRequestSessionCode();
  const verifyCodeMutation = useVerifySessionCode();

  const [step, setStep] = useState<Step>("idle");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");

  const handleDisconnect = async (id: number, ph: string) => {
    if (!confirm(`${ph} uchun sessiyani uzib qo'ymoqchimisiz?`)) return;
    try {
      await disconnectMutation.mutateAsync({ id });
      toast({ title: "Sessiya uzildi", description: `${ph} uchun ulanish tugatildi.` });
      queryClient.invalidateQueries({ queryKey: getGetSessionsQueryKey() });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Xatolik", description: err.message });
    }
  };

  const handleRequestCode = async () => {
    if (!phone.trim()) { toast({ variant: "destructive", title: "Telefon raqam kiriting" }); return; }
    try {
      const result = await requestCodeMutation.mutateAsync({ data: { phone: phone.trim() } });
      setPhoneCodeHash(result.phoneCodeHash);
      setStep("code");
      toast({ title: "Kod yuborildi ✓", description: `${phone} ga Telegram orqali tasdiqlash kodi yuborildi.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Xatolik", description: err.message });
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) { toast({ variant: "destructive", title: "Kodni kiriting" }); return; }
    try {
      await verifyCodeMutation.mutateAsync({ data: { phone: phone.trim(), code: code.trim(), phoneCodeHash } });
      toast({ title: "Sessiya qo'shildi!", description: `${phone} muvaffaqiyatli ulandi.` });
      queryClient.invalidateQueries({ queryKey: getGetSessionsQueryKey() });
      handleClose();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Kod xato yoki muddati o'tgan", description: err.message });
    }
  };

  const handleClose = () => {
    setStep("idle");
    setPhone("");
    setCode("");
    setPhoneCodeHash("");
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-primary/20 text-primary flex items-center justify-center">
            <Smartphone size={20} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sessiyalar</h1>
            <p className="text-muted-foreground mt-1">Faol Telegram ulanishlarini boshqaring.</p>
          </div>
        </div>
        <Button onClick={() => setStep("phone")} className="gap-2 font-mono text-xs uppercase tracking-wider">
          <Plus size={16} />
          Sessiya qo'shish
        </Button>
      </div>

      <div className="rounded-md border border-border/50 bg-card/50">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="font-mono text-xs uppercase tracking-wider">Telefon / Foydalanuvchi</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">Holat</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">Qo'shilgan</TableHead>
              <TableHead className="text-right font-mono text-xs uppercase tracking-wider">Amal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="border-border/50">
                  <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : !sessions?.length ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  Hech qanday sessiya topilmadi. "Sessiya qo'shish" tugmasini bosing.
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => (
                <TableRow key={session.id} className="border-border/50 transition-colors hover:bg-muted/50">
                  <TableCell>
                    <div className="font-mono font-medium text-foreground">{session.phone}</div>
                    <div className="text-xs text-muted-foreground">{session.userFullName || "Noma'lum"}</div>
                  </TableCell>
                  <TableCell>
                    {session.isActive ? (
                      <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border-emerald-500/20 font-mono text-[10px]">FAOL</Badge>
                    ) : (
                      <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground border-border/50">OFFLINE</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {format(new Date(session.createdAt), "dd.MM.yyyy HH:mm")}
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
                      Uzish
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Step 1: Phone number dialog */}
      <Dialog open={step === "phone"} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone size={18} className="text-primary" />
              Telegram raqamini kiriting
            </DialogTitle>
            <DialogDescription>
              Xalqaro formatda kiriting: <span className="font-mono text-foreground">+998901234567</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Telefon raqam</Label>
              <Input
                placeholder="+998901234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRequestCode()}
                className="font-mono bg-input/50"
                autoFocus
              />
            </div>
            <Button
              className="w-full font-mono uppercase tracking-wider"
              onClick={handleRequestCode}
              disabled={requestCodeMutation.isPending}
            >
              {requestCodeMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yuborilmoqda...</>
              ) : "Kod yuborish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Step 2: Verify code dialog */}
      <Dialog open={step === "code"} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" />
              Tasdiqlash kodi
            </DialogTitle>
            <DialogDescription>
              <span className="font-mono text-foreground">{phone}</span> ga Telegram orqali yuborilgan kodni kiriting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tasdiqlash kodi</Label>
              <Input
                placeholder="12345"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
                className="font-mono bg-input/50 text-center text-2xl tracking-[0.5em]"
                maxLength={6}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 font-mono text-xs uppercase"
                onClick={() => setStep("phone")}
                disabled={verifyCodeMutation.isPending}
              >
                Orqaga
              </Button>
              <Button
                className="flex-1 font-mono uppercase tracking-wider"
                onClick={handleVerifyCode}
                disabled={verifyCodeMutation.isPending}
              >
                {verifyCodeMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Tekshirilmoqda...</>
                ) : "Tasdiqlash"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Kod kelmadimi?{" "}
              <button
                className="text-primary underline underline-offset-2"
                onClick={() => { setStep("phone"); setCode(""); }}
              >
                Qayta yuborish
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
