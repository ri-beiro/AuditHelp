"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Pencil, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import { saveUnit, saveUser } from "@/server/actions";
import { ROLE_LABEL, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";

type UnitRow = { id: string; name: string; code: string; city: string; active: boolean };
type UserRow = { id: string; name: string; email: string; role: Role; active: boolean; unitIds: string[] };

export function AdminView({ units, users, currentUserId }: { units: UnitRow[]; users: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [unitDlg, setUnitDlg] = useState<UnitRow | "new" | null>(null);
  const [userDlg, setUserDlg] = useState<UserRow | "new" | null>(null);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="eyebrow">Administração</p>
        <h1 className="mt-1.5 text-[26px] font-extrabold leading-tight text-brand-950">Unidades e usuários</h1>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Unidades (CDs)</CardTitle>
            <CardDescription>Cada unidade tem suas próprias avaliações, evidências e planos de ação.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setUnitDlg("new")}>
            <Plus /> Nova unidade
          </Button>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-slate-100">
            {units.map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-2.5">
                <Building2 className="size-4 text-brand-700" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-800">
                    {u.name} <span className="text-xs text-slate-400">· {u.code}</span>
                  </div>
                  <div className="text-xs text-slate-500">{u.city || "—"}</div>
                </div>
                {!u.active ? <span className="text-xs text-slate-400">Inativa</span> : null}
                <button className="rounded p-1 text-slate-400 hover:bg-slate-100" onClick={() => setUnitDlg(u)}>
                  <Pencil className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Usuários</CardTitle>
            <CardDescription>
              Administrador: acesso total · Auditor: pontua matrizes e edita elementos · Responsável: evidências e planos de
              ação.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setUserDlg("new")}>
            <UserPlus /> Novo usuário
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="py-2 font-medium">Nome</th>
                <th className="py-2 font-medium">E-mail</th>
                <th className="py-2 font-medium">Perfil</th>
                <th className="py-2 font-medium">Unidades</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={cn("border-t border-slate-100", !u.active && "opacity-50")}>
                  <td className="py-2.5 font-medium text-slate-800">{u.name}</td>
                  <td className="py-2.5 text-slate-600">{u.email}</td>
                  <td className="py-2.5">{ROLE_LABEL[u.role]}</td>
                  <td className="py-2.5 text-xs text-slate-500">
                    {u.role === "ADMIN" ? "Todas" : u.unitIds.map((id) => units.find((x) => x.id === id)?.code).join(", ") || "—"}
                  </td>
                  <td className="py-2.5 text-right">
                    <button className="rounded p-1 text-slate-400 hover:bg-slate-100" onClick={() => setUserDlg(u)}>
                      <Pencil className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!unitDlg} onOpenChange={(o) => !o && setUnitDlg(null)}>
        <DialogContent title={unitDlg === "new" ? "Nova unidade" : "Editar unidade"}>
          {unitDlg ? (
            <UnitForm
              initial={unitDlg === "new" ? null : unitDlg}
              onDone={() => {
                setUnitDlg(null);
                router.refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={!!userDlg} onOpenChange={(o) => !o && setUserDlg(null)}>
        <DialogContent title={userDlg === "new" ? "Novo usuário" : "Editar usuário"}>
          {userDlg ? (
            <UserForm
              units={units}
              isSelf={userDlg !== "new" && userDlg.id === currentUserId}
              initial={userDlg === "new" ? null : userDlg}
              onDone={() => {
                setUserDlg(null);
                router.refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UnitForm({ initial, onDone }: { initial: UnitRow | null; onDone: () => void }) {
  const [f, setF] = useState(initial ?? { id: "", name: "", code: "", city: "", active: true });
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveUnit({ ...f, id: initial?.id });
          if (res.ok) {
            toast.success("Unidade salva");
            onDone();
          } else toast.error(res.error);
        });
      }}
    >
      <Field label="Nome" className="sm:col-span-2">
        <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required placeholder="CD Poços de Caldas" />
      </Field>
      <Field label="Código">
        <Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} required placeholder="CD-PCS" />
      </Field>
      <Field label="Cidade">
        <Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Ativa
      </label>
      <div className="flex justify-end sm:col-span-2">
        <Button disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : null} Salvar</Button>
      </div>
    </form>
  );
}

function UserForm({
  initial,
  units,
  isSelf,
  onDone,
}: {
  initial: UserRow | null;
  units: UnitRow[];
  isSelf: boolean;
  onDone: () => void;
}) {
  const [f, setF] = useState({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    role: initial?.role ?? ("RESPONSAVEL" as Role),
    active: initial?.active ?? true,
    unitIds: initial?.unitIds ?? [],
    password: "",
  });
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveUser({ ...f, id: initial?.id });
          if (res.ok) {
            toast.success("Usuário salvo");
            onDone();
          } else toast.error(res.error);
        });
      }}
    >
      <Field label="Nome">
        <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
      </Field>
      <Field label="E-mail">
        <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
      </Field>
      <Field label="Perfil">
        <Select value={f.role} disabled={isSelf} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
          {Object.entries(ROLE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={initial ? "Nova senha (opcional)" : "Senha inicial"}>
        <Input
          type="password"
          value={f.password}
          onChange={(e) => setF({ ...f, password: e.target.value })}
          required={!initial}
          minLength={8}
          autoComplete="new-password"
        />
      </Field>
      <div className="sm:col-span-2">
        <span className="text-xs font-medium text-slate-600">Unidades</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {units.map((u) => {
            const on = f.unitIds.includes(u.id);
            return (
              <button
                type="button"
                key={u.id}
                onClick={() => setF({ ...f, unitIds: on ? f.unitIds.filter((x) => x !== u.id) : [...f.unitIds, u.id] })}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  on ? "border-brand-600 bg-brand-50 text-brand-800" : "border-slate-200 text-slate-600",
                )}
              >
                {u.name}
              </button>
            );
          })}
        </div>
        {f.role === "ADMIN" ? <p className="mt-1 text-[11px] text-slate-500">Administradores acessam todas as unidades.</p> : null}
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" disabled={isSelf} checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Ativo
      </label>
      <div className="flex justify-end sm:col-span-2">
        <Button disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : null} Salvar</Button>
      </div>
    </form>
  );
}
