import { resolvePigAsset, type PigPose } from '../../assets/pig'
import type { PigLevel } from '../../types/pig'
import { PigImage } from './PigImage'
import './Pig.css'

export type PigSize = 'small' | 'medium' | 'large' | 'hero'

export interface PigProps {
  level?: PigLevel
  pose?: PigPose
  size?: PigSize
  name?: string
  alt?: string
  decorative?: boolean
  className?: string
  loading?: 'eager' | 'lazy'
}

export function Pig({
  level = 1,
  pose = 'idle',
  size = 'medium',
  name = '小猪',
  alt,
  decorative = false,
  className,
  loading = 'lazy',
}: PigProps) {
  const asset = resolvePigAsset(level, pose)
  const defaultAsset = resolvePigAsset(1, 'idle')
  const classNames = ['pig', `pig--${size}`, className].filter(Boolean).join(' ')
  const accessibleName = decorative ? '' : (alt ?? name)

  return (
    <span
      className={classNames}
      data-pig-level={level}
      data-pig-pose={pose}
      data-asset-level={asset.level}
      data-asset-fallback={asset.isFallback ? 'true' : 'false'}
    >
      <PigImage
        key={`${asset.src}:${asset.fallbackSrc}`}
        asset={asset}
        defaultAsset={defaultAsset}
        alt={accessibleName}
        decorative={decorative}
        loading={loading}
      />
    </span>
  )
}
