import * as ImagePicker from "expo-image-picker";
import { Alert, Linking } from "react-native";

async function explainDenied(kind: "camera" | "photo library", canAskAgain: boolean) {
  Alert.alert(
    `${kind === "camera" ? "Camera" : "Photo library"} access is off`,
    `Enable ${kind} access in system settings to use this feature. ToolKit only uses media you choose to capture or select.`,
    [
      { text: "Cancel", style: "cancel" },
      ...(canAskAgain ? [] : [{ text: "Open settings", onPress: () => void Linking.openSettings() }]),
    ],
  );
}

export async function launchMediaLibrary(options: ImagePicker.ImagePickerOptions) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    await explainDenied("photo library", permission.canAskAgain);
    return null;
  }
  return ImagePicker.launchImageLibraryAsync(options);
}

export async function launchCamera(options: ImagePicker.ImagePickerOptions) {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    await explainDenied("camera", permission.canAskAgain);
    return null;
  }
  return ImagePicker.launchCameraAsync(options);
}
