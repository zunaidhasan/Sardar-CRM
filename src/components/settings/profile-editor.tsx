"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { updateProfileAction } from "@/app/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { initials } from "@/lib/utils";
import type { Profile } from "@/lib/types";

const AVATAR_SIZE = 256;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

// Cover-crop the chosen photo into a small square JPEG data URL so the avatar
// stays tiny in the DB / demo file (no full-resolution upload).
async function fileToAvatarDataUrl(file: File): Promise<string> {
  const img = await loadImage(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    // White backdrop so transparent PNGs don't render with black corners.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
    const scale = Math.max(AVATAR_SIZE / img.width, AVATAR_SIZE / img.height);
    const sw = AVATAR_SIZE / scale;
    const sh = AVATAR_SIZE / scale;
    const sx = (img.width - sw) / 2;
    const sy = (img.height - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(img.src);
  }
}

interface ProfileEditorProps {
  profile: Profile | null;
  email: string | null;
}

export function ProfileEditor({ profile, email }: ProfileEditorProps) {
  const router = useRouter();
  const [name, setName] = React.useState(profile?.full_name ?? "");
  const [currency, setCurrency] = React.useState(profile?.currency ?? "USD");
  const [fee, setFee] = React.useState(String(profile?.default_fee_percent ?? 20));
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(
    profile?.avatar_url ?? null,
  );
  const [saving, setSaving] = React.useState(false);
  const [busyAvatar, setBusyAvatar] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const feeString = fee.trim();
  const feeNumber = Number(feeString);
  const originalAvatar = profile?.avatar_url ?? null;
  const dirty =
    name.trim() !== (profile?.full_name ?? "") ||
    currency !== (profile?.currency ?? "USD") ||
    feeNumber !== (profile?.default_fee_percent ?? 20) ||
    avatarUrl !== originalAvatar;
  const valid =
    name.trim().length <= 60 &&
    feeString !== "" &&
    Number.isFinite(feeNumber) &&
    feeNumber >= 0 &&
    feeNumber <= 100;

  async function handleFile(file: File) {
    // Canvas can only decode these formats (HEIC etc. would fail silently).
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please choose a JPG, PNG or WebP image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setBusyAvatar(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setAvatarUrl(dataUrl);
    } catch {
      toast.error("Could not read that image");
    } finally {
      setBusyAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!dirty || !valid) return;
    setSaving(true);
    const patch: Parameters<typeof updateProfileAction>[0] = {
      full_name: name.trim() || null,
      currency,
      default_fee_percent: feeNumber,
    };
    // Only send the avatar when it actually changed, so name/currency edits
    // never trip avatar validation (or re-write an unchanged image).
    if (avatarUrl !== originalAvatar) patch.avatar_url = avatarUrl;
    const result = await updateProfileAction(patch);
    setSaving(false);
    if (result.ok) {
      toast.success("Profile updated");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update profile");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
        <CardDescription>Your name, photo and workspace defaults.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 text-2xl">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={name || "Profile photo"} />}
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busyAvatar}
                onClick={() => fileRef.current?.click()}
              >
                {busyAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                Upload photo
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setAvatarUrl(null)}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Square JPG/PNG — auto-cropped and resized to 256px.
            </p>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="profile-name">Full name</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={60}
          />
        </div>

        {/* Email (login identity — read-only) */}
        <div className="space-y-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input
            id="profile-email"
            value={email ?? ""}
            readOnly
            disabled
            className="bg-muted/50"
          />
          <p className="text-xs text-muted-foreground">
            Email is your login identity and can&apos;t be changed here.
          </p>
        </div>

        {/* Currency + default fee */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(CURRENCY_SYMBOL).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c} ({CURRENCY_SYMBOL[c]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-fee">Default fee %</Label>
            <Input
              id="profile-fee"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || !dirty || !valid}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
