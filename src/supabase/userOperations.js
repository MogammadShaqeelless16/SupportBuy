import { supabase } from './supabaseClient'; // Adjust the path as needed

// Fetch all users with their roles
export const fetchUsersWithRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('users') // Your user table
        .select('id, username, email, role_id, users_businesses ( business_id, businesses ( name ) ), roles ( role_name )') // Join tables
        .order('created_at', { ascending: true });
  
      if (error) {
        throw error;
      }
  
      return data;
    } catch (error) {
      console.error('Error fetching users with roles:', error.message);
      return [];
    }
  };
// Add a new user
export const addUser = async (user) => {
  const { username, email, role_id, businessIds } = user;
  try {
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{ username, email, role_id }]);

    if (error) throw error;

    const userId = newUser[0].id;

    // Insert business associations
    const businessEntries = businessIds.map(businessId => ({
      user_id: userId,
      business_id: businessId
    }));
    const { error: businessError } = await supabase
      .from('users_businesses')
      .insert(businessEntries);

    if (businessError) throw businessError;

    console.log('User added successfully:', newUser);
    return newUser;
  } catch (error) {
    console.error('Error adding user:', error);
    return null;
  }
};

// Update an existing user
export const updateUser = async (user) => {
  const { id, username, email, role_id, businessIds } = user;
  try {
    const { error } = await supabase
      .from('users')
      .update({ username, email, role_id })
      .match({ id });

    if (error) throw error;

    // Update business associations
    await supabase.from('users_businesses').delete().match({ user_id: id });

    const businessEntries = businessIds.map(businessId => ({
      user_id: id,
      business_id: businessId
    }));
    const { error: businessError } = await supabase
      .from('users_businesses')
      .insert(businessEntries);

    if (businessError) throw businessError;

    console.log('User updated successfully:', user);
    return user;
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
};


export const checkAuth = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
    return data?.session ? true : false; // Return true if there's a session (authenticated)
  };
  
  // Sign out the user
  export const signOutUser = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  // Fetch the currently signed-in user's profile
export const fetchCurrentUser = async () => {
    const { data: session, error: sessionError } = await supabase.auth.getSession();
  
    if (sessionError || !session?.session) {
      console.error('Error fetching user session:', sessionError);
      return null;
    }
  
    const userId = session.session.user.id; // Get the user's ID from the session
  
    const { data: userProfile, error } = await supabase
      .from('users') // Adjust to your actual table name if necessary
      .select('*')
      .eq('id', userId)
      .single();
  
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  
    return userProfile;
  };
  
  // Update the current user's profile
  export const updateUserProfile = async (userId, formData) => {
    const { error } = await supabase
      .from('users') // Adjust this to your actual users table
      .update(formData)
      .eq('id', userId);
  
    if (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  
    return true;
  };

  export const fetchCurrentUserRole = async () => {
    const { data: session, error: sessionError } = await supabase.auth.getSession();
  
    if (sessionError || !session?.session) {
      console.error('Error fetching user session:', sessionError);
      return null;
    }
  
    const userId = session.session.user.id;
  
    const { data: user, error } = await supabase
      .from('users')
      .select('role_id, roles ( role_name )') // Assuming role_id and roles table
      .eq('id', userId)
      .single();
  
    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  
    return user?.roles?.role_name; // Adjust based on your schema
  };

  export const uploadProfilePicture = async (file, userId) => {
    try {
        const fileName = `${userId}.jpg`; // Use user ID as file name

        // Limit upload to JPG files only
        if (file.type !== 'image/jpeg') {
            throw new Error('Only JPG images are allowed');
        }

        const { data, error } = await supabase
            .storage
            .from('profile-pictures')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true // This option allows overwriting existing files
            });

        if (error) {
            throw error; // Throw error to handle it in MyProfilePage
        }

        // Construct the public URL based on user ID
        const publicURL = `https://hlrzkdxrzczxjmrsvmew.supabase.co/storage/v1/object/public/profile-pictures/${fileName}`;
        return publicURL; // Return the constructed public URL
    } catch (error) {
        console.error('Error uploading file:', error);
        return null; // Return null on error
    }
};