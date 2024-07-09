import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons'; // Import MaterialIcons

export default function App() {
  const [videoFiles, setVideoFiles] = useState([]);

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need media library permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: true, // Enable multi-file selection
    });

    console.log(result); // Log the result object

    if (!result.canceled && result.assets.length > 0) {
      setVideoFiles([...videoFiles, ...result.assets]);
    }
  };

  const convertVideos = () => {
    // Implement video conversion logic here
    alert('Convert button pressed!');
  };

  const deleteVideo = (uri) => {
    setVideoFiles(videoFiles.filter((video) => video.uri !== uri));
  };

  const renderItem = ({ item }) => {
    if (!item) {
      return null; // Avoid rendering if item is undefined
    }

    // Extract the file name from the URI or use fileName if available
    const fileName = item.fileName || item.uri.split('/').pop() || 'Unknown File';

    return (
      <View style={styles.videoItem}>
        <Video
          source={{ uri: item.uri }}
          rate={1.0}
          volume={1.0}
          isMuted={true}
          resizeMode="cover"
          shouldPlay={false}
          style={styles.thumbnail}
        />
        <Text style={styles.fileName}>{decodeURI(fileName)}</Text>
        <TouchableOpacity onPress={() => deleteVideo(item.uri)} style={styles.deleteButton}>
          <MaterialIcons name="delete" size={24} color="red" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Video Converter App</Text>
      <TouchableOpacity style={styles.addButton} onPress={pickVideo}>
        <Text style={styles.addButtonText}>Select or Browse Videos</Text>
      </TouchableOpacity>
      <FlatList
        data={videoFiles}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        style={styles.list}
      />
      {videoFiles.length > 0 && (
        <TouchableOpacity style={styles.convertButton} onPress={convertVideos}>
          <Text style={styles.convertButtonText}>Convert</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    elevation: 2, // Add elevation for Android
    shadowColor: '#000', // Add shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  list: {
    flex: 1,
    width: '100%',
  },
  videoItem: {
    padding: 5,
    borderBottomColor: '#ccc',
    borderBottomWidth: 0.7,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 70,
    height: 70,
    marginRight: 10,
  },
  fileName: {
    fontSize: 16,
    marginLeft: 10, // Adjust margin as needed
    flex: 1,
  },
  deleteButton: {
    marginLeft: 10,
  },
  convertButton: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  convertButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
