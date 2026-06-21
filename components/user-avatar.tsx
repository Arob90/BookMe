'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User } from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface UserAvatarProps {
  userId?: string
  email?: string
  className?: string
}

export function UserAvatar({ userId, email, className = 'h-10 w-10' }: UserAvatarProps) {
  const [profileData, setProfileData] = useState<{
    profilePhoto: string | null
    firstName: string | null
    lastName: string | null
  } | null>(null)

  useEffect(() => {
    if (userId) {
      // Fetch profile data
      fetch(`/api/user/profile?userId=${userId}`)
        .then(res => res.json())
        .then(data => {
          if (data.profilePhoto || data.firstName || data.lastName) {
            setProfileData(data)
          }
        })
        .catch(() => {
          // Silently fail - just use email initials
        })
    }
  }, [userId])

  const initials = profileData?.firstName && profileData?.lastName
    ? getInitials(profileData.firstName, profileData.lastName)
    : email
    ? email.charAt(0).toUpperCase()
    : 'U'

  return (
    <Avatar className={`${className} ring-2 ring-pink-500 ring-offset-0`}>
      {profileData?.profilePhoto && (
        <AvatarImage src={profileData.profilePhoto} alt={initials} />
      )}
      <AvatarFallback>
        {initials || <User className="h-5 w-5" />}
      </AvatarFallback>
    </Avatar>
  )
}
