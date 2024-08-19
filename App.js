import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Dimensions, ScrollView, LayoutAnimation, UIManager,PermissionsAndroid, Platform, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import * as FileSystem from 'expo-file-system';

import { FFmpegKit, FFprobeKit } from 'ffmpeg-kit-react-native';
import { MaterialIcons } from '@expo/vector-icons'; // Import MaterialIcons
import * as MediaLibrary from 'expo-media-library';
const windowWidth = Dimensions.get('window').width;



if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function App() {
  const [videoFiles, setVideoFiles] = useState([]);
  const [isGridView, setIsGridView] = useState(false);
  const [progress, setProgress] = useState(0);


  const mapRange = (options) => {
    const { value, inputMin, inputMax, outputMin, outputMax } = options;
    const result =
      ((value - inputMin) / (inputMax - inputMin)) * (outputMax - outputMin) +
      outputMin;
  
    if (result === Infinity || result < outputMin) return outputMin;
    if (result > outputMax) return outputMax;
  
    return result;
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need media library permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newFiles = result.assets.filter(
        (newFile) => !videoFiles.some((existingFile) => existingFile.uri === newFile.uri)
      );

      if (newFiles.length < result.assets.length) {
        Alert.alert('Duplicate Files', 'Some files were already added.');
      }
      const uri = result.assets[0].uri;
      //console.log(videoFiles);

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setVideoFiles([...videoFiles, ...newFiles]);
    }
  };


  const extractNameFromFileUrl = (uri, config) => {
    const splittedUri = uri.split('/');
    const fullName = splittedUri[splittedUri.length - 1];

    const lastDotIndex = fullName.lastIndexOf('.');
    const fileName = lastDotIndex !== -1 ? fullName.slice(0, lastDotIndex) : fullName;
    const fileExtension = lastDotIndex !== -1 ? fullName.slice(lastDotIndex + 1) : undefined;

    let newFileName = fileName.replace(/[^a-zA-Z0-9]/g, '_').replace(/\s+/g, '_');

    if (config?.separateBoth) {
      return {
        name: newFileName,
        extension: fileExtension,
      };
    }

    if (config?.trimExt) {
      return newFileName;
    }

    return fileExtension ? `${newFileName}.${fileExtension}` : newFileName;
  };



  async function requestStoragePermission() {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission Required',
            message: 'This app needs access to your storage to save files.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
  
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Storage permission granted');
          // Proceed with your file operations
          return true; // Permission granted
        } else if (granted === PermissionsAndroid.RESULTS.DENIED) {
          console.log('Storage permission denied');
          Alert.alert(
            'Permission Denied',
            'You need to grant storage permission to save files.',
            [
              {
                text: 'Retry',
                onPress: requestStoragePermission, // Retry requesting permission
              },
              {
                text: 'Open Settings',
                onPress: () => Linking.openSettings(), // Open the app's settings
              },
              { text: 'Cancel', style: 'cancel' },
            ],
          );
          return false; // Permission denied
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          console.log('Storage permission denied permanently');
          Alert.alert(
            'Permission Denied Permanently',
            'You have permanently denied the storage permission. Please go to settings to enable it.',
            [
              {
                text: 'Open Settings',
                onPress: () => Linking.openSettings(), // Open the app's settings
              },
              { text: 'Cancel', style: 'cancel' },
            ],
          );
          return false; // Permission denied permanently
        }
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  



  
  const convertVideos = async () => {
    requestStoragePermission();
    const hasPermission = await requestStoragePermission();

    if (!hasPermission) {
      // If permission is not granted, stop the conversion process
      return;
    }

    if (videoFiles.length > 0) {
      const uri = videoFiles[0].uri;
      const { name, extension } = extractNameFromFileUrl(uri, {
        separateBoth: true,
      });
  
      const uniqueFileName = `${name}_${Date.now()}.${extension}`;
      const cacheDir = FileSystem.cacheDirectory;
      const uniqueFilePath = `${cacheDir}/${uniqueFileName}`;
  
      await FileSystem.copyAsync({ from: uri, to: uniqueFilePath });
  
      const mediaInfo = await FFprobeKit.getMediaInformation(uniqueFilePath);
      const output = await mediaInfo.getOutput();
      const durationinMillis = JSON.parse(output).format.duration * 1000;
  
      const uniqueOutputName = `${name}_${Date.now()}.mp3`;
      const outputPath = `${FileSystem.documentDirectory}${uniqueOutputName}`;
  
      const command = `-i ${uniqueFilePath} -vn -acodec libmp3lame -qscale:a 2 ${outputPath}`;
      await FFmpegKit.executeAsync(
        command,
        session => {},
        log => {
          log.getMessage();
        },
        statistics => {
          const progress = Math.round(
            mapRange({
              value: statistics.getTime(),
              inputMin: 0,
              inputMax: durationinMillis,
              outputMin: 0,
              outputMax: 100,
            }),
          );
          console.log(progress);
          setProgress(progress);
        },
      );
  
      // Save the file to the Downloads folder
      const asset = await MediaLibrary.createAssetAsync(outputPath);
      const album = await MediaLibrary.getAlbumAsync('Download');
  
      if (album == null) {
        await MediaLibrary.createAlbumAsync('Download', asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }
  
      Alert.alert('Success', 'File saved to Downloads folder.');
    } else {
      Alert.alert('No Videos', 'No videos have been selected.');
    }
  };
  


 


  const deleteVideo = (uri) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setVideoFiles(videoFiles.filter((video) => video.uri !== uri));
  };

  const clearAllVideos = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setVideoFiles([]);
  };

  const toggleLayout = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsGridView(!isGridView);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Video Converter App</Text>
      <TouchableOpacity style={styles.addButton} onPress={pickVideo}>
        <Text style={styles.addButtonText}>Select or Browse Videos</Text>
      </TouchableOpacity>
      <View style={styles.headerContainer}>
        <Text style={styles.videoCount}>Total Videos: {videoFiles.length}</Text>
        {videoFiles.length > 0 && (
          <>
            <TouchableOpacity onPress={clearAllVideos} style={styles.clearButtonContainer}>
              <MaterialIcons name="clear" size={24} color="red" style={styles.clearIcon} />
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toggleLayoutButton} onPress={toggleLayout}>
              <MaterialIcons name={isGridView ? 'view-list' : 'view-module'} size={24} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </View>
      {isGridView ? (
        <ScrollView contentContainerStyle={styles.gridContainer}>
          {videoFiles.map((item, index) => (
            <View key={index} style={styles.videoItemGrid}>
              <Video
                source={{ uri: item.uri }}
                rate={1.0}
                volume={1.0}
                isMuted={true}
                resizeMode="cover"
                shouldPlay={false}
                style={styles.thumbnailGrid}
              />
              <TouchableOpacity onPress={() => deleteVideo(item.uri)} style={styles.deleteButtonGrid}>
                <MaterialIcons name="delete" size={24} color="red" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.list}>
          {videoFiles.map((item, index) => (
            <View key={index} style={styles.videoItem}>
              <Video
                source={{ uri: item.uri }}
                rate={1.0}
                volume={1.0}
                isMuted={true}
                resizeMode="cover"
                shouldPlay={false}
                style={styles.thumbnail}
              />
              <Text style={styles.fileName}>{decodeURI(item.fileName || item.uri.split('/').pop() || 'Unknown File')}</Text>
              <TouchableOpacity onPress={() => deleteVideo(item.uri)} style={styles.deleteButton}>
                <MaterialIcons name="delete" size={24} color="red" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      {videoFiles.length > 0 && (
        <TouchableOpacity style={styles.convertButton} onPress={convertVideos}>
          <Text style={styles.convertButtonText}>Convert</Text>
        </TouchableOpacity>
      )}
      {progress > 0 && (
        <Text style={styles.progressText}>{progress}% Completed</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  addButton: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 5,
    width: '100%',
    elevation: 2, // Add elevation for Android
    shadowColor: '#000', // Add shadow for iOS
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  videoCount: {
    fontSize: 18,
  },
  clearButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  clearIcon: {
    marginRight: 5,
  },
  clearAllText: {
    fontSize: 16,
    color: 'red',
    textDecorationLine: 'underline',
  },
  toggleLayoutButton: {
    backgroundColor: '#007BFF',
    padding: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
  videoItemGrid: {
    flexDirection: 'column',
    alignItems: 'center',
    margin: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 2,
    position: 'relative',
  },
  thumbnail: {
    width: 70,
    height: 70,
    marginRight: 10,
  },
  thumbnailGrid: {
    width: 80,
    height: 80,
    marginBottom: 0,
  },
  fileName: {
    fontSize: 16,
    marginLeft: 10,
    flex: 1,
  },
  deleteButton: {
    marginLeft: 60,
    width: 20,
    height: 20,
  },
  deleteButtonGrid: {
    position: 'absolute',
    bottom: 5,
    right: 5,

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
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 5,
    width: '100%',
  },
});

