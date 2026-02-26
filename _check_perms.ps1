$acl = Get-Acl 'C:\Windows\System32\drivers\etc\hosts'
$acl.Access | Select-Object IdentityReference, FileSystemRights, AccessControlType
