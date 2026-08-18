import React, { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { getChildPhotoUrl } from '../lib/childPhoto';

type Props = { uri?: string | null; style?: StyleProp<ImageStyle> };

/**
 * Renders a child photo from a storage path or URL. Storage paths are resolved
 * to short-lived signed URLs (private bucket) before rendering.
 */
export default function ChildPhoto({ uri, style }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setSrc(null);
    if (!uri) return;
    getChildPhotoUrl(uri).then((url) => {
      if (alive) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [uri]);

  if (!src) return null;
  return <Image source={{ uri: src }} style={style} />;
}
