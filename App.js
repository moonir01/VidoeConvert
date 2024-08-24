import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Dimensions, ScrollView, LayoutAnimation, UIManager, PermissionsAndroid, Platform, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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
  const [convertedVideoUri, setConvertedVideoUri] = useState(null); // Track the URI of the converted video

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

  const saveFile = async (uri) => {
    try {
      if (Platform.OS === "android") {
        // Request permission to access storage if not already granted
        const hasPermission = await MediaLibrary.requestPermissionsAsync();
        if (hasPermission.granted) {
          // Save file to the Movies or Downloads folder
          const asset = await MediaLibrary.createAssetAsync(uri);
          const album = await MediaLibrary.getAlbumAsync('Download');
          
          if (!album) {
            await MediaLibrary.createAlbumAsync('Download', asset, false);
          } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album.id, false);
          }
  
          Alert.alert('Success', 'File saved to gallery successfully!');
        } else {
          Alert.alert('Permission Denied', 'You need to grant storage permission to save files.');
        }
      } else {
        // iOS export: Share the file using Sharing API
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save the file.');
      console.error(error);
    }
  };

  const convertVideos = async () => {
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

      const uniqueOutputName = `${name}_${Date.now()}_modified.mp4`;
      const outputPath = `${FileSystem.documentDirectory}${uniqueOutputName}`;
      const command = `-i ${uniqueFilePath} -af "atempo=1.02,bass=g=4:f=80:w=3,treble=g=4:f=3200:w=3,firequalizer=gain_entry='entry(0,0);entry(62,2);entry(125,1.5);entry(250,1);entry(500,1);entry(1000,1);entry(2000,1.5);entry(4000,2.5);entry(8000,3);entry(16000,4)',compand=attacks=0.05:decays=0.25:points=-80/-80-50/-15-30/-10-10/-2:soft-knee=4:gain=2,deesser,highpass=f=35,lowpass=f=17000,loudnorm=I=-16:LRA=11:TP=-1.5,volume=3.9dB" -c:v copy -c:a aac -b:a 224k -ar 48000 ${outputPath}`;

      await FFmpegKit.executeAsync(
        command,
        session => { },
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

      // Update state with the URI of the converted video
      setConvertedVideoUri(outputPath);
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


  
  const handleExport = async () => {
    if (convertedVideoUri) {
      await saveFile(convertedVideoUri);
    } else {
      Alert.alert('No Video', 'Please convert a video before exporting.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Video Converter App</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.selectButton} onPress={pickVideo}>
          <Text style={styles.addButtonText}>Select Video</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.selectButton} onPress={handleExport}>
          <Text style={styles.addButtonText}>Export</Text>
        </TouchableOpacity>
      </View>

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
  buttonContainer: {
    flexDirection: 'row', // Arrange buttons in a row
    justifyContent: 'space-between', // Space out the buttons
    width: '100%',
    marginBottom: 10,
  },
  selectButton: {
    flex: 1, // Make each button take up equal space
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 5,
  },
});
