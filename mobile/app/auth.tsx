import { router, useLocalSearchParams } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "@/components/BrandMark";
import { forgotPassword, OAuthProvider, register, resendVerification, resetPassword, restoreAccount, signIn, signInWithOAuth, verifyEmail } from "@/services/auth";
import { useSessionStore } from "@/store/session";

export default function AuthScreen() {
  const { action, token } = useLocalSearchParams<{ action?: string; token?: string }>();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [actionComplete, setActionComplete] = useState<string | null>(null);
  const setSession = useSessionStore((state) => state.setSession);

  useEffect(() => {
    if (action !== "verify" || !token) return;
    setBusy(true); setError(null);
    void verifyEmail(token).then(() => setActionComplete("Your email is verified. You can now sign in.")).catch((cause) => setError(cause instanceof Error ? cause.message : "Verification failed")).finally(() => setBusy(false));
  }, [action, token]);

  const submitRecovery = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      if (action === "reset" && token) { if (newPassword.length < 8) throw new Error("Use at least 8 characters for your new password."); await resetPassword(token, newPassword); setActionComplete("Your password has been reset. Sign in with the new password."); }
      else if (action === "restore") { if (!email.trim() || !password) throw new Error("Enter the email and password for the deleted account."); const payload = await restoreAccount(email.trim(), password); await setSession(payload.accessToken, payload.refreshToken, payload.user); router.replace("/(tabs)"); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Account recovery failed"); }
    finally { setBusy(false); }
  };

  if (action === "verify") return <ActionScreen title="Verify your email" detail={actionComplete ?? (busy ? "Verifying your secure link…" : error ?? "This verification link could not be used.")} error={Boolean(error)} onDone={actionComplete ? () => router.replace("/auth") : undefined} />;
  if (action === "reset" || action === "restore") return <SafeAreaView className="flex-1 items-center justify-center bg-background px-6"><View className="w-full max-w-md gap-5"><BrandMark /><Text className="text-3xl font-bold text-foreground">{action === "reset" ? "Choose a new password" : "Restore your account"}</Text><Text className="leading-6 text-muted-foreground">{actionComplete ?? (action === "reset" ? "Reset the password for this verified recovery link." : "Restore an account during its 30-day recovery window.")}</Text>{!actionComplete ? <>{action === "restore" ? <Field placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} /> : null}<Field placeholder={action === "reset" ? "New password" : "Password"} secureTextEntry value={action === "reset" ? newPassword : password} onChangeText={action === "reset" ? setNewPassword : setPassword} />{error ? <Text accessibilityRole="alert" className="text-destructive">{error}</Text> : null}<Pressable disabled={busy} onPress={() => void submitRecovery()} className="min-h-14 items-center justify-center rounded-2xl bg-primary disabled:opacity-50">{busy ? <ActivityIndicator color="white" /> : <Text className="font-bold text-white">{action === "reset" ? "Reset password" : "Restore account"}</Text>}</Pressable></> : <Pressable onPress={() => router.replace("/auth")} className="min-h-14 items-center justify-center rounded-2xl bg-primary"><Text className="font-bold text-white">Continue to sign in</Text></Pressable>}</View></SafeAreaView>;

  const submit = async () => {
    if (busy) return;
    if (!email.trim() || !password || (mode === "register" && !name.trim())) {
      setError("Complete all required fields.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = mode === "signin"
        ? await signIn(email.trim(), password)
        : await register(name.trim(), email.trim(), password);
      if ("verificationRequired" in payload) {
        setVerificationEmail(payload.email);
        return;
      }
      await setSession(payload.accessToken, payload.refreshToken, payload.user);
      router.replace("/(tabs)");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: OAuthProvider) => {
    if (busy) return;
    setBusy(true); setError(null);
    try { const payload = await signInWithOAuth(provider); await setSession(payload.accessToken, payload.refreshToken, payload.user); router.replace("/(tabs)"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "OAuth sign-in failed"); }
    finally { setBusy(false); }
  };

  if (verificationEmail) return (
    <SafeAreaView className="flex-1 items-center justify-center gap-6 bg-background px-6">
      <BrandMark />
      <Text className="text-center text-3xl font-bold text-foreground">Check your email</Text>
      <Text className="text-center leading-6 text-muted-foreground">We sent a verification link to {verificationEmail}. Verify it, then sign in.</Text>
      <Pressable onPress={() => void resendVerification(verificationEmail)} className="min-h-14 w-full max-w-md items-center justify-center rounded-2xl border border-border bg-card"><Text className="font-bold text-foreground">Resend verification</Text></Pressable>
      <Pressable onPress={() => { setVerificationEmail(null); setMode("signin"); }}><Text className="font-bold text-primary">Back to sign in</Text></Pressable>
    </SafeAreaView>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="flex-grow justify-center px-6 py-8">
          <View className="mx-auto w-full max-w-md gap-8">
            <BrandMark />
            <View className="gap-2">
              <Text className="text-3xl font-bold tracking-tight text-foreground">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </Text>
              <Text className="text-base text-muted-foreground">
                {mode === "signin" ? "Sign in to continue to ToolKit." : "Start building and sharing your toolkit."}
              </Text>
            </View>
            <View className="gap-3">
              {mode === "register" ? <Field placeholder="Name" autoComplete="name" value={name} onChangeText={setName} /> : null}
              <Field placeholder="Email" autoComplete="email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
              <View className="relative">
                <Field placeholder="Password" autoComplete={mode === "signin" ? "current-password" : "new-password"} secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
                <Pressable onPress={() => setShowPassword((value) => !value)} className="absolute right-2 top-2 h-10 w-10 items-center justify-center" accessibilityLabel={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff size={19} color="#6f6a87" /> : <Eye size={19} color="#6f6a87" />}
                </Pressable>
              </View>
              {error ? <Text accessibilityRole="alert" className="text-sm text-destructive">{error}</Text> : null}
              <Pressable disabled={busy} className="mt-2 h-14 items-center justify-center rounded-2xl bg-primary active:opacity-80 disabled:opacity-60" onPress={() => void submit()}>
                {busy ? <ActivityIndicator color="white" /> : <Text className="text-base font-bold text-white">{mode === "signin" ? "Sign in" : "Create account"}</Text>}
              </Pressable>
              {mode === "signin" ? <Pressable onPress={() => {
                if (!email.trim()) return setError("Enter your email first.");
                void forgotPassword(email.trim()).then(() => setError("If that account exists, a reset link is on its way.")).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not request reset"));
              }}><Text className="text-center font-medium text-primary">Forgot password?</Text></Pressable> : null}
            </View>
            <View className="flex-row items-center gap-3"><View className="h-px flex-1 bg-border" /><Text className="text-xs uppercase tracking-widest text-muted-foreground">or continue with</Text><View className="h-px flex-1 bg-border" /></View>
            <View className="flex-row flex-wrap gap-2">
              {([['google','Google'],['github','GitHub'],['linkedin','LinkedIn'],['discord','Discord']] as const).map(([provider, label]) => (
                <Pressable key={provider} disabled={busy} onPress={() => void oauth(provider)} className="min-w-[46%] flex-1 items-center rounded-2xl border border-border bg-card px-3 py-4 disabled:opacity-60">
                  <Text className="font-semibold text-foreground">{label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setMode((value) => value === "signin" ? "register" : "signin")}>
              <Text className="text-center text-muted-foreground">
                {mode === "signin" ? "New to ToolKit? " : "Already have an account? "}<Text className="font-bold text-primary">{mode === "signin" ? "Create account" : "Sign in"}</Text>
              </Text>
            </Pressable>
            <Text className="text-center text-xs leading-5 text-muted-foreground">By continuing, you agree to ToolKit’s Terms and Privacy Policy.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor="#6f6a87" className="h-14 rounded-2xl border border-border bg-input px-4 pr-12 text-base text-foreground" {...props} />;
}

function ActionScreen({ title, detail, error, onDone }: { title: string; detail: string; error: boolean; onDone?: () => void }) {
  return <SafeAreaView className="flex-1 items-center justify-center bg-background px-6"><View className="w-full max-w-md items-center gap-6"><BrandMark /><Text className="text-center text-3xl font-bold text-foreground">{title}</Text><Text accessibilityRole={error ? "alert" : undefined} className={`text-center leading-6 ${error ? "text-destructive" : "text-muted-foreground"}`}>{detail}</Text>{onDone ? <Pressable onPress={onDone} className="min-h-14 w-full items-center justify-center rounded-2xl bg-primary"><Text className="font-bold text-white">Continue</Text></Pressable> : null}</View></SafeAreaView>;
}
