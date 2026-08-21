import React, { useEffect, useRef, useState } from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { getChildPhotoUrl, invalidateChildPhotoUrl } from '../lib/childPhoto';

type Props = { uri?: string | null; style?: StyleProp<ImageStyle> };

/**
 * Renders a child photo from a storage path or URL. Storage paths are resolved
 * to short-lived signed URLs (private bucket). If a signed URL fails to load
 * (expired), the cache entry is dropped and the URL is re-minted once.
 */
export default function ChildPhoto({ uri, style }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const retried = useRef(false);

  useEffect(() => {
    let alive = true;
    retried.current = false;
    setSrc(null);
    if (!uri) return;
    getChildPhotoUrl(uri).then((url) => {
      if (alive) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [uri]);

  const handleError = () => {
    if (!uri || retried.current) return;
    retried.current = true;
    invalidateChildPhotoUrl(uri);
    getChildPhotoUrl(uri).then((url) => setSrc(url));
  };

  if (!src) return null;
  return <Image source={{ uri: src }} style={style} onError={handleError} />;
}
