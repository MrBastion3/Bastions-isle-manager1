function isAdmin(member, settings) {
  // Get the array of role IDs from the member object
  const userRoles = member.roles.cache.map(role => role.id);
  // Check if any of the user's roles match the admin roles in settings
  return userRoles.some(roleId => settings.adminRoles.includes(roleId));
}

module.exports = { isAdmin };
