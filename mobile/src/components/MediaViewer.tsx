import { useState } from "react";
import { Dimensions, FlatList, Image, Modal, Pressable, Text, View } from "react-native";
import { Maximize2, X } from "lucide-react-native";
import { useVideoPlayer, VideoView } from "expo-video";

export interface ViewableMedia { id: string; type: string; url: string }

export function MediaViewer({ media, height = 320 }: { media: ViewableMedia[]; height?: number }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [index, setIndex] = useState(0);
  if (!media.length) return null;
  const render = ({ item }: { item: ViewableMedia }) => <MediaAsset item={item} height={height} />;
  return <>
    <View className="overflow-hidden rounded-3xl bg-black"><FlatList data={media} horizontal pagingEnabled nestedScrollEnabled showsHorizontalScrollIndicator={false} keyExtractor={(item) => item.id} renderItem={render} onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width))} /><Pressable accessibilityLabel="Open media fullscreen" onPress={() => setFullscreen(true)} className="absolute right-3 top-3 h-11 w-11 items-center justify-center rounded-full bg-black/60"><Maximize2 color="white" size={18} /></Pressable>{media.length > 1 ? <View className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1.5"><Text className="text-xs font-bold text-white">{index + 1}/{media.length}</Text></View> : null}</View>
    <Modal visible={fullscreen} animationType="fade" presentationStyle="fullScreen" onRequestClose={() => setFullscreen(false)}><View className="flex-1 justify-center bg-black"><FlatList initialScrollIndex={index} getItemLayout={(_, itemIndex) => ({ length: Dimensions.get("window").width, offset: Dimensions.get("window").width * itemIndex, index: itemIndex })} data={media} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={(item) => `full-${item.id}`} renderItem={({ item }) => <MediaAsset item={item} height={Dimensions.get("window").height} fullscreen />} /><Pressable accessibilityLabel="Close fullscreen media" onPress={() => setFullscreen(false)} className="absolute right-5 top-14 h-12 w-12 items-center justify-center rounded-full bg-white/20"><X color="white" size={24} /></Pressable></View></Modal>
  </>;
}

function MediaAsset({ item, height, fullscreen = false }: { item: ViewableMedia; height: number; fullscreen?: boolean }) {
  const width = Dimensions.get("window").width - (fullscreen ? 0 : 40);
  if (item.type === "video") return <VideoAsset url={item.url} width={width} height={height} />;
  return <Image source={{ uri: item.url }} style={{ width, height }} resizeMode={fullscreen ? "contain" : "cover"} accessibilityLabel="Post image" />;
}

function VideoAsset({ url, width, height }: { url: string; width: number; height: number }) {
  const player = useVideoPlayer(url, (instance) => { instance.loop = false; });
  return <VideoView player={player} style={{ width, height }} nativeControls contentFit="contain" accessibilityLabel="Post video" />;
}
