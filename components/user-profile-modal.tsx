'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getUserProfile, updateUserProfile, updateUserPassword } from '@/app/actions/user'
import { BUSINESS_CATEGORIES } from '@/lib/business-categories'
import { useToast } from '@/components/ui/use-toast'
import { Upload, X, User as UserIcon, Lock } from 'lucide-react'
import Image from 'next/image'
import { formatUtcDateToYmd } from '@/lib/date-only'
import { getInitials } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onProfileUpdated?: () => void
}

export function ProfileModal({ open, onOpenChange, userId, onProfileUpdated }: ProfileModalProps) {
  const { toast } = useToast()
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)

  const [profileData, setProfileData] = useState({
    userName: '',
    businessName: '',
    businessCategory: '',
    district: 'BELIZE',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthday: '',
    address: '',
    profilePhoto: '',
  })

  const DISTRICTS: Array<{ value: string; label: string }> = [
    { value: 'COROZAL', label: 'Corozal' },
    { value: 'ORANGE_WALK', label: 'Orange Walk' },
    { value: 'BELIZE', label: 'Belize' },
    { value: 'CAYO', label: 'Cayo' },
    { value: 'STANN_CREEK', label: 'Stann Creek' },
    { value: 'TOLEDO', label: 'Toledo' },
    { value: 'SAN_PEDRO', label: 'San Pedro' },
    { value: 'CAYE_CAULKER', label: 'Caye Caulker' },
  ]

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Load user profile
  useEffect(() => {
    if (open && userId) {
      loadProfile()
    }
  }, [open, userId])

  const loadProfile = async () => {
    setIsLoading(true)
    try {
      const userProfile = await getUserProfile()
      setProfile(userProfile)
      setProfileData({
        userName: userProfile.userName || '',
        businessName: userProfile.businessName || '',
        businessCategory: (userProfile as { businessCategory?: string | null }).businessCategory || '',
        district: (userProfile.district || 'BELIZE') as string,
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        birthday: userProfile.birthday ? formatUtcDateToYmd(userProfile.birthday) : '',
        address: userProfile.address || '',
        profilePhoto: userProfile.profilePhoto || '',
      })
      setImagePreview(userProfile.profilePhoto || '')
    } catch (error: any) {
      console.error('Error loading profile:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load profile. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive',
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image size must be less than 5MB',
        variant: 'destructive',
      })
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('type', 'profile')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload image')
      }

      const data = await response.json()
      setProfileData({ ...profileData, profilePhoto: data.url })
      setSelectedFile(null)
      toast({
        title: 'Success',
        description: 'Profile photo uploaded successfully',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      await updateUserProfile(profileData)
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      })
      loadProfile() // Reload to get updated data
      // Notify parent component that profile was updated
      if (onProfileUpdated) {
        onProfileUpdated()
      }
      // Refresh the router to update all components
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive',
      })
      return
    }

    setIsChangingPassword(true)
    try {
      await updateUserPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })
      toast({
        title: 'Success',
        description: 'Password changed successfully',
      })
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-1 flex-shrink-0">
          <DialogTitle className="text-base">Profile Settings</DialogTitle>
        </DialogHeader>
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <p className="text-sm text-muted-foreground">Loading profile...</p>
          </div>
        )}

        <Tabs defaultValue="profile" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0 h-9">
            <TabsTrigger value="profile" className="gap-1.5 text-xs">
              <UserIcon className="h-3 w-3" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="password" className="gap-1.5 text-xs">
              <Lock className="h-3 w-3" />
              Password
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-2 mt-2 flex-1 min-h-0 overflow-y-auto">
            {/* Profile Photo */}
            <div className="flex flex-col items-center space-y-2">
              <div className="relative">
                <Avatar className="h-12 w-12 ring-2 ring-gray-200">
                  <AvatarImage src={imagePreview || profileData.profilePhoto} alt="Profile" />
                  <AvatarFallback className="text-sm">
                    {profileData.firstName && profileData.lastName
                      ? getInitials(profileData.firstName, profileData.lastName)
                      : profileData.email
                      ? profileData.email.charAt(0).toUpperCase()
                      : 'U'}
                  </AvatarFallback>
                </Avatar>
                {(imagePreview || profileData.profilePhoto) && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full"
                    onClick={() => {
                      setProfileData({ ...profileData, profilePhoto: '' })
                      setImagePreview('')
                      setSelectedFile(null)
                    }}
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                )}
              </div>

              <div className="flex gap-2 items-center">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="cursor-pointer max-w-xs text-xs h-8"
                  disabled={isUploading}
                />
                {selectedFile && (
                  <Button onClick={handleUpload} disabled={isUploading} size="sm" className="h-8 text-xs">
                    <Upload className="h-3 w-3 mr-1" />
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="userName" className="text-xs">User Name</Label>
              <Input
                id="userName"
                value={profileData.userName}
                onChange={(e) =>
                  setProfileData({ ...profileData, userName: e.target.value })
                }
                placeholder="Display name (shown in dropdown)"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="businessName" className="text-xs">Business Name</Label>
              <Input
                id="businessName"
                value={profileData.businessName}
                onChange={(e) =>
                  setProfileData({ ...profileData, businessName: e.target.value })
                }
                placeholder="Your business name"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Business Category</Label>
              <Select
                value={profileData.businessCategory}
                onValueChange={(value) => setProfileData({ ...profileData, businessCategory: value })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">District</Label>
              <Select
                value={profileData.district}
                onValueChange={(value) => setProfileData({ ...profileData, district: value })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  {DISTRICTS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="firstName" className="text-xs">First Name</Label>
                <Input
                  id="firstName"
                  value={profileData.firstName}
                  onChange={(e) =>
                    setProfileData({ ...profileData, firstName: e.target.value })
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-xs">Last Name</Label>
                <Input
                  id="lastName"
                  value={profileData.lastName}
                  onChange={(e) =>
                    setProfileData({ ...profileData, lastName: e.target.value })
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                className="h-8 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-xs">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                className="h-8 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="birthday" className="text-xs">Birthday</Label>
              <Input
                id="birthday"
                type="date"
                value={profileData.birthday}
                onChange={(e) => setProfileData({ ...profileData, birthday: e.target.value })}
                className="h-8 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="address" className="text-xs">Address</Label>
              <Textarea
                id="address"
                value={profileData.address}
                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                rows={2}
                placeholder="Street address, city, state, zip code"
                className="text-sm"
              />
            </div>

            <div className="flex justify-end pt-2 border-t flex-shrink-0">
              <Button onClick={handleSaveProfile} disabled={isSaving} size="sm" className="h-8 text-xs">
                {isSaving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="password" className="space-y-2 mt-2 flex-1 min-h-0 overflow-y-auto">
            <div>
              <Label htmlFor="currentPassword" className="text-xs">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, currentPassword: e.target.value })
                }
                className="h-8 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="newPassword" className="text-xs">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, newPassword: e.target.value })
                }
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Must be at least 6 characters
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-xs">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                }
                className="h-8 text-sm"
              />
            </div>

            <div className="flex justify-end pt-2 border-t flex-shrink-0">
              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                variant="default"
                size="sm"
                className="h-8 text-xs"
              >
                {isChangingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}


