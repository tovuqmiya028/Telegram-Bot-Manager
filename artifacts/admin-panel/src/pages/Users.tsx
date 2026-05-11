import { useState } from "react";
import { 
  useGetUsers, 
  useBlockUser, 
  useUnblockUser, 
  useDeleteUser,
  useGetUserTasks,
  useGetUserContacts
} from "@workspace/api-client-react";
import { getGetUsersQueryKey } from "@workspace/api-client-react/generated/api";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ShieldBan, ShieldCheck, Trash2, Activity } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Users() {
  const { data: users, isLoading } = useGetUsers();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();
  const deleteMutation = useDeleteUser();

  const handleBlockToggle = async (user: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (user.isBlocked) {
        await unblockMutation.mutateAsync({ id: user.id });
        toast({ title: "User unblocked", description: `${user.fullName} has been unblocked.` });
      } else {
        await blockMutation.mutateAsync({ id: user.id });
        toast({ title: "User blocked", description: `${user.fullName} has been blocked.` });
      }
      queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Action failed", description: err.message });
    }
  };

  const handleDelete = async (id: number, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete user ${name}? This action is irreversible.`)) return;
    
    try {
      await deleteMutation.mutateAsync({ id });
      toast({ title: "User deleted", description: `${name} has been permanently removed.` });
      queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Deletion failed", description: err.message });
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nodes</h1>
        <p className="text-muted-foreground mt-2">Manage connected user accounts and their automated routines.</p>
      </div>

      <div className="rounded-md border border-border/50 bg-card/50">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="font-mono text-xs uppercase tracking-wider">ID / Name</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">Telegram ID</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">Session Status</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">Joined</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">State</TableHead>
              <TableHead className="text-right font-mono text-xs uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-border/50">
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : users?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No nodes found in the system.
                </TableCell>
              </TableRow>
            ) : (
              users?.map((user) => (
                <TableRow 
                  key={user.id} 
                  className="cursor-pointer border-border/50 transition-colors hover:bg-muted/50"
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <TableCell>
                    <div className="font-medium text-foreground">{user.fullName}</div>
                    <div className="text-xs text-muted-foreground font-mono">@{user.username || "unknown"}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{user.telegramId}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`font-mono text-[10px] uppercase border-border/50 ${user.sessionStatus === 'ACTIVE' ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                      {user.sessionStatus || "INACTIVE"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {format(new Date(user.joinedAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {user.isBlocked ? (
                      <Badge variant="destructive" className="font-mono text-[10px]">BLOCKED</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/20 font-mono text-[10px]">ACTIVE</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={(e) => handleBlockToggle(user, e)}
                        title={user.isBlocked ? "Unblock User" : "Block User"}
                      >
                        {user.isBlocked ? <ShieldCheck size={16} /> : <ShieldBan size={16} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDelete(user.id, user.fullName, e)}
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedUserId && (
        <UserDetailDrawer 
          userId={selectedUserId} 
          open={!!selectedUserId} 
          onOpenChange={(open) => !open && setSelectedUserId(null)} 
        />
      )}
    </div>
  );
}

function UserDetailDrawer({ userId, open, onOpenChange }: { userId: number; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: tasks, isLoading: tasksLoading } = useGetUserTasks(userId);
  const { data: contacts, isLoading: contactsLoading } = useGetUserContacts(userId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 border-l border-border bg-card">
        <div className="p-6 border-b border-border/50">
          <SheetHeader>
            <SheetTitle className="text-xl flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Node Diagnostics
            </SheetTitle>
            <SheetDescription>
              Detailed view of scheduled tasks and synced contacts.
            </SheetDescription>
          </SheetHeader>
        </div>

        <Tabs defaultValue="tasks" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4 border-b border-border/50">
            <TabsList className="w-full grid grid-cols-2 bg-muted/50 border border-border/50">
              <TabsTrigger value="tasks" className="data-[state=active]:bg-card">Active Tasks</TabsTrigger>
              <TabsTrigger value="contacts" className="data-[state=active]:bg-card">Known Contacts</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              <TabsContent value="tasks" className="m-0 mt-2 space-y-4">
                {tasksLoading ? (
                  <div className="space-y-4">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                  </div>
                ) : tasks?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border border-dashed border-border/50 rounded-lg">
                    No active tasks scheduled for this node.
                  </div>
                ) : (
                  tasks?.map(task => (
                    <div key={task.id} className="p-4 rounded-lg border border-border/50 bg-background/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="font-mono text-[10px] border-primary/20 text-primary">
                          {task.scheduleType}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          Target: {task.contactName}
                        </span>
                      </div>
                      <p className="text-sm font-medium line-clamp-2 leading-relaxed">{task.messageText}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono pt-2 border-t border-border/50">
                        <span>Time: {task.scheduleTime}</span>
                        <span>Sent: {task.sentCount}</span>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="contacts" className="m-0 mt-2 space-y-4">
                {contactsLoading ? (
                  <div className="space-y-3">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : contacts?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border border-dashed border-border/50 rounded-lg">
                    No contacts synced for this node.
                  </div>
                ) : (
                  contacts?.map(contact => (
                    <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50">
                      <div className="font-medium text-sm">{contact.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">
                        {contact.username ? `@${contact.username}` : contact.telegramId}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
