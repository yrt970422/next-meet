import { useState } from 'react'
import type { PigAsset } from '../../assets/pig'

type PigImageAttempt =
  | 'primary-webp'
  | 'primary-png'
  | 'default-webp'
  | 'default-png'
  | 'placeholder'

interface PigImageProps {
  asset: PigAsset
  defaultAsset: PigAsset
  alt: string
  decorative: boolean
  loading: 'eager' | 'lazy'
}

export function PigImage({
  asset,
  defaultAsset,
  alt,
  decorative,
  loading,
}: PigImageProps) {
  const [attempt, setAttempt] =
    useState<PigImageAttempt>('primary-webp')
  const [isLoaded, setIsLoaded] = useState(false)
  const isDefaultAsset =
    asset.src === defaultAsset.src &&
    asset.fallbackSrc === defaultAsset.fallbackSrc

  const source =
    attempt === 'primary-webp'
      ? asset.src
      : attempt === 'primary-png'
        ? asset.fallbackSrc
        : attempt === 'default-webp'
          ? defaultAsset.src
          : defaultAsset.fallbackSrc

  const handleError = () => {
    setIsLoaded(false)
    setAttempt((currentAttempt) => {
      if (currentAttempt === 'primary-webp') {
        return 'primary-png'
      }
      if (currentAttempt === 'primary-png') {
        return isDefaultAsset ? 'placeholder' : 'default-webp'
      }
      if (currentAttempt === 'default-webp') {
        return 'default-png'
      }
      return 'placeholder'
    })
  }

  if (attempt === 'placeholder') {
    return (
      <span
        className="pig__placeholder pig__placeholder--error"
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : alt}
        aria-hidden={decorative || undefined}
      >
        <span aria-hidden="true">✦</span>
      </span>
    )
  }

  return (
    <>
      {!isLoaded ? (
        <span className="pig__placeholder pig__placeholder--loading" aria-hidden="true">
          <span>✦</span>
        </span>
      ) : null}
      <img
        className={[
          'pig__image',
          isLoaded ? 'pig__image--loaded' : '',
        ].filter(Boolean).join(' ')}
        src={source}
        alt={alt}
        aria-hidden={decorative || undefined}
        loading={loading}
        decoding="async"
        fetchPriority={loading === 'eager' ? 'high' : 'auto'}
        draggable={false}
        onLoad={() => setIsLoaded(true)}
        onError={handleError}
      />
    </>
  )
}
